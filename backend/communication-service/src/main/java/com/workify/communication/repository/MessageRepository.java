package com.workify.communication.repository;

import com.workify.communication.domain.Message;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface MessageRepository extends JpaRepository<Message, Long> {

    /** Count messages grouped by hour-of-day for the last N days (admin heatmap). */
    @Query("SELECT FUNCTION('HOUR', m.createdAt), COUNT(m) FROM Message m " +
           "WHERE m.createdAt >= :since AND (m.isDeleted IS NULL OR m.isDeleted = false) " +
           "GROUP BY FUNCTION('HOUR', m.createdAt) ORDER BY FUNCTION('HOUR', m.createdAt)")
    List<Object[]> countByHourSince(@Param("since") LocalDateTime since);

    /** Count messages grouped by day for the last N days (velocity chart). */
    @Query("SELECT FUNCTION('DATE', m.createdAt), COUNT(m) FROM Message m " +
           "WHERE m.createdAt >= :since AND (m.isDeleted IS NULL OR m.isDeleted = false) " +
           "GROUP BY FUNCTION('DATE', m.createdAt) ORDER BY FUNCTION('DATE', m.createdAt)")
    List<Object[]> countByDaySince(@Param("since") LocalDateTime since);

    /** Top N senders by message count. */
    @Query("SELECT m.senderId, COUNT(m) FROM Message m " +
           "WHERE (m.isDeleted IS NULL OR m.isDeleted = false) " +
           "GROUP BY m.senderId ORDER BY COUNT(m) DESC")
    List<Object[]> findTopSenders(org.springframework.data.domain.Pageable pageable);

    /** Most recent flagged messages. */
    @Query("SELECT m FROM Message m WHERE m.isFlagged = true " +
           "AND (m.isDeleted IS NULL OR m.isDeleted = false) " +
           "ORDER BY m.createdAt DESC")
    List<Message> findRecentFlagged(org.springframework.data.domain.Pageable pageable);

    /**
     * Returns all non-deleted messages for a conversation, INCLUDING blocked ones sent by any user.
     * Internal use only (e.g. admin, soft-delete cleanup).
     */
    @Query("SELECT m FROM Message m WHERE m.conversation.id = :conversationId " +
            "AND (m.isDeleted = false OR m.isDeleted IS NULL) ORDER BY m.createdAt ASC")
    List<Message> findByConversationId(@Param("conversationId") Long conversationId);

    /**
     * Returns non-deleted messages for a conversation visible to {@code userId}:
     * all normal messages PLUS blocked messages that were sent BY {@code userId}.
     * Blocked messages from other senders are excluded so the recipient never receives them.
     */
    @Query("SELECT m FROM Message m WHERE m.conversation.id = :conversationId " +
            "AND (m.isDeleted = false OR m.isDeleted IS NULL) " +
            "AND (m.deliveryStatus <> com.workify.communication.enums.DeliveryStatus.BLOCKED " +
            "     OR m.senderId = :userId) " +
            "ORDER BY m.createdAt ASC")
    List<Message> findByConversationIdForUser(
            @Param("conversationId") Long conversationId,
            @Param("userId") Long userId);

    /**
     * Count messages in a conversation that were NOT sent by userId and are not yet READ.
     * Used to compute the unreadCount badge for the recipient.
     */
    @Query("SELECT COUNT(m) FROM Message m " +
           "WHERE m.conversation.id = :convId " +
           "AND m.senderId <> :userId " +
           "AND (m.isDeleted IS NULL OR m.isDeleted = false) " +
           "AND m.deliveryStatus <> com.workify.communication.enums.DeliveryStatus.READ")
    long countUnread(@Param("convId") Long convId, @Param("userId") Long userId);

    /**
     * Returns the most recent non-deleted message for a conversation (limit 1).
     * Used to populate lastMessageContent and lastMessageSenderId on Conversation.
     * BLOCKED messages are excluded so that the conversation list never shows
     * the raw content of a moderated message as the preview.
     */
    @Query("SELECT m FROM Message m " +
           "WHERE m.conversation.id = :convId " +
           "AND (m.isDeleted IS NULL OR m.isDeleted = false) " +
           "AND (m.deliveryStatus IS NULL OR m.deliveryStatus <> com.workify.communication.enums.DeliveryStatus.BLOCKED) " +
           "AND (m.isFlagged IS NULL OR m.isFlagged = false) " +
           "ORDER BY m.createdAt DESC")
    List<Message> findLastByConversation(@Param("convId") Long convId, org.springframework.data.domain.Pageable pageable);

    /**
     * Permanently deletes all BLOCKED (content-moderated) messages sent by a user.
     * Called when the 5-minute ban expires so neither sender nor receiver sees the
     * blocked bubbles anymore.
     */
    @Modifying
    @Query("DELETE FROM Message m WHERE m.deliveryStatus = com.workify.communication.enums.DeliveryStatus.BLOCKED AND m.senderId = :userId")
    int deleteBlockedMessagesBySender(@Param("userId") Long userId);

        /**
         * Permanently deletes messages that are either deliveryStatus=BLOCKED OR is_flagged=true.
         * This is more robust for historical rows that may have only the boolean flag set.
         */
        @Modifying
        @Query("DELETE FROM Message m WHERE (m.deliveryStatus = com.workify.communication.enums.DeliveryStatus.BLOCKED OR m.isFlagged = true) AND m.senderId = :userId")
        int deleteFlaggedOrBlockedMessagesBySender(@Param("userId") Long userId);

    /**
     * Returns all non-deleted TEXT messages for a conversation within a date/time window.
     * Used by NoteExtractionService for daily smart-note generation.
     */
    @Query("SELECT m FROM Message m WHERE m.conversation.id = :convId " +
           "AND (m.isDeleted IS NULL OR m.isDeleted = false) " +
           "AND m.contentType = com.workify.communication.enums.ContentType.TEXT " +
           "AND m.createdAt >= :from AND m.createdAt < :to " +
           "ORDER BY m.createdAt ASC")
    List<Message> findTextMessagesByDateRange(
            @Param("convId") Long conversationId,
            @Param("from") java.time.LocalDateTime from,
            @Param("to")   java.time.LocalDateTime to);

    /**
     * Returns distinct conversationId values for conversations that had text messages
     * on a given day. Used by the DailyNoteScheduler.
     */
    @Query("SELECT DISTINCT m.conversation.id FROM Message m " +
           "WHERE (m.isDeleted IS NULL OR m.isDeleted = false) " +
           "AND m.contentType = com.workify.communication.enums.ContentType.TEXT " +
           "AND m.createdAt >= :from AND m.createdAt < :to")
    List<Long> findActiveConversationIdsByDateRange(
            @Param("from") java.time.LocalDateTime from,
            @Param("to")   java.time.LocalDateTime to);

    /**
     * Returns the most recent non-deleted message in a conversation that was NOT sent
     * by {@code userId}.  Used by LoginCheckService to detect unanswered messages:
     * if this message is also the last overall, the conversation is unanswered.
     */
    @Query("SELECT m FROM Message m " +
           "WHERE m.conversation.id = :convId " +
           "AND m.senderId <> :userId " +
           "AND (m.isDeleted IS NULL OR m.isDeleted = false) " +
           "ORDER BY m.createdAt DESC")
    List<Message> findLastMessageByOtherUser(
            @Param("convId") Long convId,
            @Param("userId") Long userId,
            org.springframework.data.domain.Pageable pageable);
}