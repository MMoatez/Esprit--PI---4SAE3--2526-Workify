package com.workify.communication.scheduler;

import com.workify.communication.domain.Conversation;
import com.workify.communication.domain.Message;
import com.workify.communication.enums.PriorityLevel;
import com.workify.communication.repository.ConversationRepository;
import com.workify.communication.repository.MessageRepository;
import com.workify.communication.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.domain.PageRequest;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Scheduler that enforces priority rules:
 * - If a conversation receives a message and no reply within 1 minute -> send reminder, set priority HIGH
 * - If a conversation remains inactive for 5 minutes -> set priority LOW and archive
 +*
 * This implementation is intentionally conservative and idempotent: it re-reads
 * conversation state before applying updates and logs actions. Replace the
 * NotificationService stubs with real push delivery.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class ConversationPriorityScheduler {

    private final ConversationRepository conversationRepository;
    private final MessageRepository messageRepository;
    private final NotificationService notificationService;

    private static final Duration REMINDER_DELAY = Duration.ofMinutes(1);
    private static final Duration ARCHIVE_DELAY  = Duration.ofMinutes(5);

    @Scheduled(fixedRate = 10_000)
    @Transactional
    public void runChecks() {
        LocalDateTime now = LocalDateTime.now();
        List<Conversation> all = conversationRepository.findAll();
        for (Conversation c : all) {
            try {
                if (c.getIsArchived() != null && c.getIsArchived()) continue;
                LocalDateTime last = c.getLastMessageAt();
                if (last == null) continue;
                Duration age = Duration.between(last, now);

                // Reminder window: >=1min and <5min
                if (age.compareTo(REMINDER_DELAY) >= 0 && age.compareTo(ARCHIVE_DELAY) < 0) {
                    // Only send if not already HIGH
                    if (c.getPriorityLevel() != PriorityLevel.HIGH) {
                        // fetch last message to determine who to notify (the other participant)
                        List<Message> lastMsg = messageRepository.findLastByConversation(c.getId(), PageRequest.of(0,1));
                        if (lastMsg.isEmpty()) continue;
                        Message m = lastMsg.get(0);
                        Long notifyUserId = m.getSenderId().equals(c.getCreatorId()) ? c.getReceiverId() : c.getCreatorId();

                        // Update priority → HIGH
                        c.setPriorityLevel(PriorityLevel.HIGH);
                        conversationRepository.save(c);
                        log.info("Bumped conversation {} to HIGH due to unanswered message", c.getId());
                        notificationService.sendReminder(notifyUserId, c);
                    }
                }

                // Archive window: >=5min
                if (age.compareTo(ARCHIVE_DELAY) >= 0) {
                    if (c.getIsArchived() == null || !c.getIsArchived()) {
                        c.setPriorityLevel(PriorityLevel.LOW);
                        c.setIsArchived(true);
                        c.setArchivedAt(LocalDateTime.now());
                        conversationRepository.save(c);
                        log.info("Auto-archived conversation {} due to inactivity", c.getId());
                        notificationService.sendArchiveNotice(c);
                    }
                }
            } catch (Exception ex) {
                log.error("Error processing conversation {}: {}", c.getId(), ex.getMessage());
            }
        }
    }
}
