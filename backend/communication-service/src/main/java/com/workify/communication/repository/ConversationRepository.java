package com.workify.communication.repository;

import com.workify.communication.domain.Conversation;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ConversationRepository extends JpaRepository<Conversation, Long> {

    /**
     * Returns ALL existing conversations between two users regardless of archived/blocked status,
     * ordered by lastMessageAt DESC (most recent first).
     *
     * Returning a List instead of Optional prevents NonUniqueResultException when duplicate rows
     * exist (legacy data). The service picks the best one:
     *   - active + non-blocked  → return as-is
     *   - active + blocked      → throw BlockedConversationException
     *   - archived + non-blocked → auto-unarchive and return (prevents creating a new duplicate)
     */
    @Query("""
            SELECT c FROM Conversation c
            WHERE (
                (c.creatorId  = :userId1 AND c.receiverId = :userId2) OR
                (c.creatorId  = :userId2 AND c.receiverId = :userId1)
            )
            ORDER BY c.lastMessageAt DESC
            """)
    List<Conversation> findAllByParticipants(
            @Param("userId1") Long userId1,
            @Param("userId2") Long userId2
    );

    @Query("""
            SELECT c FROM Conversation c
            WHERE c.creatorId = :userId OR c.receiverId = :userId
            """)
    Page<Conversation> findAllByUserId(
            @Param("userId") Long userId,
            Pageable pageable
    );

    /**
     * Returns ALL conversations for a user regardless of archived / blocked status.
     * Used by LoginCheckService to scan every conversation (including auto-archived
     * and blocked ones) for unanswered messages at login time.
     */
    @Query("""
            SELECT c FROM Conversation c
            WHERE c.creatorId = :userId OR c.receiverId = :userId
            """)
    List<Conversation> findAllByUserIdIncludingArchived(@Param("userId") Long userId);
}