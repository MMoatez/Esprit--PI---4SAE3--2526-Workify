package com.workify.feedbackservice.domains;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/** Message WebSocket envoyé via SimpMessagingTemplate */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FeedbackNotification {

    private String type;
    private String title;
    private String message;
    private String icon;
    private Long   relatedId;
    private LocalDateTime timestamp;

    public static FeedbackNotification evaluationPending(Long offerId, String projectTitle, long secondsRemaining) {
        long days = Math.max(1, (long) Math.ceil(secondsRemaining / 86400.0));
        return FeedbackNotification.builder()
                .type("EVALUATION_PENDING")
                .title("Feedback required")
                .message(String.format(
                        "Your project \"%s\" is complete. Leave your feedback within %d day(s).",
                        projectTitle, days))
                .icon("⭐")
                .relatedId(offerId)
                .timestamp(LocalDateTime.now())
                .build();
    }

    public static FeedbackNotification evaluationReminder(Long offerId, String projectTitle, long secondsLeft) {
        return FeedbackNotification.builder()
                .type("EVALUATION_REMINDER")
                .title("Last chance!")
                .message(String.format(
                        "You have %d seconds left to evaluate the project \"%s\".",
                        secondsLeft, projectTitle))
                .icon("⚠")
                .relatedId(offerId)
                .timestamp(LocalDateTime.now())
                .build();
    }

    public static FeedbackNotification feedbackReceived(Long feedbackId, String projectTitle) {
        return FeedbackNotification.builder()
                .type("FEEDBACK_RECEIVED")
                .title("New feedback received")
                .message(String.format(
                        "A client has rated your work on project \"%s\". View and reply.",
                        projectTitle))
                .icon("💬")
                .relatedId(feedbackId)
                .timestamp(LocalDateTime.now())
                .build();
    }

    public static FeedbackNotification responseReceived(Long feedbackId, String projectTitle) {
        return FeedbackNotification.builder()
                .type("RESPONSE_RECEIVED")
                .title("Feedback reply received")
                .message(String.format(
                        "The freelancer has replied to your review on project \"%s\".",
                        projectTitle))
                .icon("↩")
                .relatedId(feedbackId)
                .timestamp(LocalDateTime.now())
                .build();
    }

    public static FeedbackNotification evaluationClosed(Long offerId, String projectTitle) {
        return FeedbackNotification.builder()
                .type("EVALUATION_CLOSED")
                .title("Evaluation closed")
                .message(String.format(
                        "The evaluation deadline for project \"%s\" has expired.",
                        projectTitle))
                .icon("🔒")
                .relatedId(offerId)
                .timestamp(LocalDateTime.now())
                .build();
    }
}
