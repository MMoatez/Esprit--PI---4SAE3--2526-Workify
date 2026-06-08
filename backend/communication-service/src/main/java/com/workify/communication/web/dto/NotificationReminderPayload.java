package com.workify.communication.web.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Payload emitted via SSE and returned by /api/notifications/login-scan.
 *
 * Encapsulates all data needed by the frontend to display a rich
 * reminder toast without any additional HTTP calls.
 *
 * priority : "HIGH" (>1 min unanswered) | "MEDIUM" (<1 min) | "LOW" (>5 min / archived)
 * type     : "reminder" | "login_reminder" | "archive_notice"
 * message  : pre-formatted display string, e.g.:
 *            "User #42 has sent you a message 3 minutes ago. Please check the conversation."
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationReminderPayload {

    /** Conversation that needs attention. */
    private Long conversationId;

    /** User that should receive the notification. */
    private Long targetUserId;

    /** User that sent the last unanswered message. */
    private Long senderId;

    /** How many minutes have elapsed since the last unanswered message. */
    private long elapsedMinutes;

    /** Human-readable elapsed label, e.g. "3 minutes", "2 hours", "1 day". */
    private String elapsedLabel;

    /** Priority level string: HIGH | MEDIUM | LOW. */
    private String priority;

    /** Event type: reminder | login_reminder | archive_notice. */
    private String type;

    /** Pre-formatted message ready for display in the toast. */
    private String message;
}
