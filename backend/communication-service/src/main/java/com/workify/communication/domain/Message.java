package com.workify.communication.domain;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.workify.communication.enums.ContentType;
import com.workify.communication.enums.DeliveryStatus;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "messages")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Message {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // ==========================================
    // 🔗 RELATION AVEC CONVERSATION
    // ==========================================
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "conversation_id", nullable = false)
    @JsonIgnore  // Évite boucle infinie lors de la sérialisation JSON
    private Conversation conversation;

    @Column(name = "sender_id", nullable = false)
    private Long senderId;

    @Column(name = "content", columnDefinition = "LONGTEXT", nullable = false)
    private String content;

    @Enumerated(EnumType.STRING)
    @Column(name = "content_type")
    private ContentType contentType;

    @Column(name = "reaction_emoji")
    private String reactionEmoji;

    @Enumerated(EnumType.STRING)
    @Column(name = "delivery_status")
    private DeliveryStatus deliveryStatus;

    @Column(name = "is_flagged")
    private Boolean isFlagged;

    @Column(name = "flagged_reason")
    private String flaggedReason;

    /** 1, 2, or 3 — which violation in the current cycle triggered this block. Null for clean messages. */
    @Column(name = "violation_number")
    private Integer violationNumber;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "is_deleted")
    private Boolean isDeleted;

    @Column(name = "is_edited")
    private Boolean isEdited;

    // ==========================================
    // HELPER METHOD pour la colonne conversation_id
    // ==========================================
    @Transient
    public Long getConversationId() {
        return conversation != null ? conversation.getId() : null;
    }

    public void setConversationId(Long conversationId) {
        // Cette méthode sera appelée lors du build
        // La relation sera définie via setConversation()
    }

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        if (contentType == null) {
            contentType = ContentType.TEXT;
        }
        if (deliveryStatus == null) {
            deliveryStatus = DeliveryStatus.SENT;
        }
        if (isFlagged == null) {
            isFlagged = false;
        }
        if (isDeleted == null) {
            isDeleted = false;
        }
        if (isEdited == null) {
            isEdited = false;
        }
    }
}