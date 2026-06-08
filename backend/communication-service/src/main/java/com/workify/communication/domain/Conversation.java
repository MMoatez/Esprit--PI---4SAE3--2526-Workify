package com.workify.communication.domain;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.workify.communication.enums.ConversationStatus;
import com.workify.communication.enums.PriorityLevel;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "conversations")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Conversation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "creator_id", nullable = false)
    private Long creatorId;

    @Column(name = "receiver_id", nullable = false)
    private Long receiverId;

    @Column(name = "title")
    private String title;

    @Column(name = "theme_color")
    private String themeColor;

    @Column(name = "emoji_icon")
    private String emojiIcon;

    @Column(name = "is_favorite")
    private Boolean isFavorite;

    @Column(name = "is_archived")
    private Boolean isArchived;

    @Column(name = "archived_at")
    private LocalDateTime archivedAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "priority_level")
    private PriorityLevel priorityLevel;

    @Column(name = "last_message_at")
    private LocalDateTime lastMessageAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "status")
    private ConversationStatus status;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "blocked_by_id")
    private Long blockedById;

    // ==========================================
    // COMPUTED — NOT PERSISTED
    // ==========================================
    /** Number of unread messages for the requesting user. Set by ConversationController before serialisation. */
    @Transient
    private Integer unreadCount;

    /** Content of the last non-deleted message. Set by ConversationController before serialisation. */
    @Transient
    private String lastMessageContent;

    /** senderId of the last non-deleted message. Set by ConversationController before serialisation. */
    @Transient
    private Long lastMessageSenderId;

    /**
     * True when the REQUESTING user is the one who initiated the block.
     * Set by ConversationController.enrichConversation() — never persisted.
     */
    @Transient
    private Boolean blockedByMe;

    // ==========================================
    // RELATION WITH MESSAGES
    // ==========================================
    @OneToMany(
            mappedBy = "conversation",
            cascade = CascadeType.ALL,
            orphanRemoval = true,
            fetch = FetchType.LAZY
    )
    @Builder.Default
    @JsonIgnore
    private List<Message> messages = new ArrayList<>();

    // ==========================================
    // HELPER METHODS
    // ==========================================
    public void addMessage(Message message) {
        messages.add(message);
        message.setConversation(this);
    }

    public void removeMessage(Message message) {
        messages.remove(message);
        message.setConversation(null);
    }

    /**
     * BUG FIX: Previously this method unconditionally overwrote every field,
     * including values already set by the builder (e.g. isArchived = true from
     * softDelete). This silently reset isArchived back to false on the very first
     * save, making soft-deletes invisible — so "deleted" conversations were still
     * returned by findByParticipants and blocked re-creation.
     *
     * Fix: use null-checks so builder-supplied values are always preserved.
     */
    @PrePersist
    protected void onCreate() {
        // Always stamp creation timestamps
        if (createdAt == null)     createdAt     = LocalDateTime.now();
        if (lastMessageAt == null) lastMessageAt = LocalDateTime.now();

        // Only apply defaults when the builder did NOT already provide a value
        if (isFavorite    == null) isFavorite    = false;
        if (isArchived    == null) isArchived     = false;
        if (status        == null) status         = ConversationStatus.ACTIVE;
        if (priorityLevel == null) priorityLevel  = PriorityLevel.MEDIUM;
        if (themeColor    == null) themeColor     = "#4A90E2";
        if (emojiIcon     == null) emojiIcon      = "\uD83D\uDCAC"; // 💬
    }
}