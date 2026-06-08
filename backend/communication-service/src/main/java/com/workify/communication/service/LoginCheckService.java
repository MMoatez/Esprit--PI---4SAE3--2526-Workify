package com.workify.communication.service;

import com.workify.communication.domain.Conversation;
import com.workify.communication.domain.Message;
import com.workify.communication.repository.ConversationRepository;
import com.workify.communication.repository.MessageRepository;
import com.workify.communication.web.dto.NotificationReminderPayload;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * LoginCheckService — computes all pending reminder payloads for a user at login time.
 *
 * Algorithm (per conversation, per Rule #4 of the spec):
 *  1. Fetch all conversations the user participates in (active, archived, blocked).
 *  2. For each conversation, get the most recent non-deleted message overall.
 *  3. If the last message was sent by the current user → already replied, skip.
 *  4. Otherwise the conversation is "unanswered"; compute elapsed time and derive priority:
 *       elapsed > 5 min  → LOW  (yellow motif)
 *       elapsed > 1 min  → HIGH (red motif)
 *       elapsed ≤ 1 min  → MEDIUM (orange motif)
 *  5. Build a NotificationReminderPayload with a formatted reminder message.
 *
 * Note: sender names are expressed as "User #<id>" here because the communication-service
 * does not own user profile data.  The Angular frontend resolves the human-readable name
 * from its MessagingStateService (which already stores otherUserFirstName etc.) and
 * overwrites the display text before showing the toast.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class LoginCheckService {

    private final ConversationRepository conversationRepository;
    private final MessageRepository      messageRepository;

    private static final Duration HIGH_THRESHOLD = Duration.ofMinutes(1);
    private static final Duration LOW_THRESHOLD  = Duration.ofMinutes(5);

    /**
     * Returns one NotificationReminderPayload per unanswered conversation
     * for the given user.  Includes archived and blocked conversations.
     */
    public List<NotificationReminderPayload> computeLoginReminders(Long userId) {
        List<Conversation> all    = conversationRepository.findAllByUserIdIncludingArchived(userId);
        List<NotificationReminderPayload> result = new ArrayList<>();
        LocalDateTime now = LocalDateTime.now();

        for (Conversation c : all) {
            try {
                // Last non-deleted message in this conversation (any sender)
                List<Message> lastMsgs = messageRepository.findLastByConversation(
                        c.getId(), PageRequest.of(0, 1));
                if (lastMsgs.isEmpty()) continue;

                Message last = lastMsgs.get(0);

                // If the last message was sent BY this user → they already replied → skip
                if (last.getSenderId().equals(userId)) continue;

                // The last message belongs to the other participant → unanswered
                Duration age     = Duration.between(last.getCreatedAt(), now);
                long     minutes = age.toMinutes();

                String priority;
                if      (age.compareTo(LOW_THRESHOLD)  >= 0) priority = "LOW";
                else if (age.compareTo(HIGH_THRESHOLD) >= 0) priority = "HIGH";
                else                                          priority = "MEDIUM";

                String elapsedLabel = NotificationService.buildElapsedLabel(minutes);
                String message      = "User #" + last.getSenderId()
                        + " has sent you a message " + elapsedLabel
                        + " ago. Please check the conversation.";

                result.add(NotificationReminderPayload.builder()
                        .conversationId(c.getId())
                        .targetUserId(userId)
                        .senderId(last.getSenderId())
                        .elapsedMinutes(minutes)
                        .elapsedLabel(elapsedLabel)
                        .priority(priority)
                        .type("login_reminder")
                        .message(message)
                        .build());

            } catch (Exception ex) {
                log.warn("LoginCheckService: error processing conv {} for user {}: {}",
                        c.getId(), userId, ex.getMessage());
            }
        }

        log.info("LoginCheckService: {} reminder(s) computed for user {}", result.size(), userId);
        return result;
    }
}
