package com.workify.communication.web.dto;

import lombok.*;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MessageResponse {
    private Long id;
    private Long conversationId;
    private Long senderId;
    private String content;
    private String contentType;
    private String deliveryStatus;
    private String reactionEmoji;
    private Boolean isDeleted;
    private Boolean isEdited;
    private LocalDateTime createdAt;

    // ── Content moderation fields (null on clean messages) ────────────────────
    private Boolean isFlagged;
    private String flaggedReason;
    /** How many period violations the sender has accumulated (1-based; null on clean send). */
    private Integer violationCount;
    /** ISO datetime of ban expiry — non-null only on the response that triggers a ban. */
    private String bannedUntil;
}