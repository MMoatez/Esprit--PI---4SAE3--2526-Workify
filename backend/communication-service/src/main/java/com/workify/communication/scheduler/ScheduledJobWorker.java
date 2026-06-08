package com.workify.communication.scheduler;

import com.workify.communication.domain.Conversation;
import com.workify.communication.domain.Message;
import com.workify.communication.domain.ScheduledJob;
import com.workify.communication.enums.PriorityLevel;
import com.workify.communication.repository.ConversationRepository;
import com.workify.communication.repository.MessageRepository;
import com.workify.communication.repository.ScheduledJobRepository;
import com.workify.communication.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import java.time.LocalDateTime;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class ScheduledJobWorker {

    private final ScheduledJobRepository scheduledJobRepository;
    private final ConversationRepository conversationRepository;
    private final MessageRepository messageRepository;
    private final NotificationService notificationService;
    private final io.micrometer.core.instrument.MeterRegistry meterRegistry;

    /** On startup: purge any jobs that were locked but never deleted (e.g. after a server crash). */
    @EventListener(ApplicationReadyEvent.class)
    @Transactional
    public void cleanupStaleJobs() {
        int deleted = scheduledJobRepository.deleteStaleLockedJobs(LocalDateTime.now());
        if (deleted > 0) {
            log.warn("Startup cleanup: deleted {} stale locked scheduled jobs", deleted);
        }
    }

    @Scheduled(fixedRate = 5000)
    @Transactional
    public void processDueJobs() {
        LocalDateTime now = LocalDateTime.now();
        List<ScheduledJob> due = scheduledJobRepository.findDueJobs(now);
        for (ScheduledJob job : due) {
            boolean didLock = false;
            try {
                int locked = scheduledJobRepository.lockJob(job.getId());
                if (locked == 0) continue; // someone else locked it
                didLock = true;

                if ("unanswered_check".equals(job.getJobType())) {
                    processUnanswered(job);
                } else if ("archive_check".equals(job.getJobType())) {
                    processArchive(job);
                }
            } catch (Exception ex) {
                log.error("Error processing scheduled job {}: {}", job.getId(), ex.getMessage());
            } finally {
                // Always delete the job once locked so it never accumulates as locked=1.
                if (didLock) {
                    scheduledJobRepository.deleteById(job.getId());
                }
            }
        }
    }

    private void processUnanswered(ScheduledJob job) {
        Conversation c = conversationRepository.findById(job.getConversationId()).orElse(null);
        if (c == null || (c.getIsArchived() != null && c.getIsArchived())) return;
        // fetch last message
        List<Message> last = messageRepository.findLastByConversation(c.getId(), org.springframework.data.domain.PageRequest.of(0,1));
        if (last.isEmpty()) return;
        Message m = last.get(0);
        // if last message sender is same as both participants? we notify the other
        Long notifyUserId = m.getSenderId().equals(c.getCreatorId()) ? c.getReceiverId() : c.getCreatorId();
        // No time-based "recent activity" check here: it caused false positives when the sender
        // sent multiple quick messages (lastMessageAt shifted forward, triggering an early skip).
        // The only duplicate guard needed is the priority level check below.
        if (c.getPriorityLevel() != PriorityLevel.HIGH) {
            c.setPriorityLevel(PriorityLevel.HIGH);
            conversationRepository.save(c);
            notificationService.sendReminder(notifyUserId, c);
            log.info("ScheduledJob: bumped convo {} to HIGH", c.getId());
            try { meterRegistry.counter("reminders.sent").increment(); } catch (Exception ignored) {}
        }
    }

    private void processArchive(ScheduledJob job) {
        Conversation c = conversationRepository.findById(job.getConversationId()).orElse(null);
        if (c == null) return;
        if (c.getIsArchived() != null && c.getIsArchived()) return;
        if (c.getLastMessageAt() != null) {
            if (c.getLastMessageAt().isAfter(job.getDueAt().minusSeconds(30))) {
                // activity after scheduling -> skip archiving
                return;
            }
        }
        c.setPriorityLevel(PriorityLevel.LOW);
        c.setIsArchived(true);
        c.setArchivedAt(LocalDateTime.now());
        conversationRepository.save(c);
        notificationService.sendArchiveNotice(c);
        log.info("ScheduledJob: archived convo {}", c.getId());
        try { meterRegistry.counter("archives.count").increment(); } catch (Exception ignored) {}
    }
}
