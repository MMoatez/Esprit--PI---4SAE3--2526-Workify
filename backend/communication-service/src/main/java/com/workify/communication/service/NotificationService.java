package com.workify.communication.service;

import com.workify.communication.domain.Conversation;
import com.workify.communication.web.dto.NotificationReminderPayload;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * NotificationService — SSE-based push for the Dynamic Priority system.
 *
 * Responsibilities:
 *  1. Maintain per-user SSE connections.
 *  2. Send rich reminder payloads with priority, elapsed time and a
 *     pre-formatted message consumed by the Angular toast component.
 *  3. Rate-limit / debounce: the same (user, conversation) pair cannot
 *     fire more than once per DEBOUNCE window — idempotent delivery.
 *  4. sendLoginReminders() batch-pushes all pending reminders on reconnect.
 *  5. sendArchiveNotice() informs both participants on auto-archive.
 *
 * For production clusters replace in-memory maps with Redis pub/sub —
 * the public API stays identical.
 */
@Service
@Slf4j
public class NotificationService {

    /** Minimum gap before the same (user, conversation) reminder can fire again. */
    private static final Duration DEBOUNCE = Duration.ofMinutes(2);

    /** userId → live SSE emitter. */
    private final Map<Long, SseEmitter>      emitters       = new ConcurrentHashMap<>();

    /**
     * Idempotency / debounce map.
     * key = "userId:conversationId" → timestamp of last reminder dispatched.
     */
    private final Map<String, LocalDateTime> lastReminderAt = new ConcurrentHashMap<>();

    // ── Subscribe ─────────────────────────────────────────────────────

    public SseEmitter subscribe(Long userId) {
        SseEmitter emitter = new SseEmitter(0L); // no timeout
        emitter.onCompletion(() -> emitters.remove(userId));
        emitter.onTimeout(()    -> emitters.remove(userId));
        emitter.onError((ex)   -> emitters.remove(userId));
        emitters.put(userId, emitter);
        log.info("SSE subscriber registered for user {}", userId);
        try {
            emitter.send(SseEmitter.event().name("connected").data("connected"));
        } catch (IOException e) {
            log.warn("Failed to send initial SSE event to user {}: {}", userId, e.getMessage());
        }
        return emitter;
    }

    // ── Reminder — scheduler-facing (backward-compatible) ────────────

    /**
     * Called by ConversationPriorityScheduler and ScheduledJobWorker.
     * Builds a basic HIGH-priority payload from the conversation's lastMessageAt
     * then routes through the debounced sendReminderEvent pipeline.
     */
    public void sendReminder(Long targetUserId, Conversation c) {
        LocalDateTime lastMsg = c.getLastMessageAt();
        long elapsed = lastMsg != null
                ? Duration.between(lastMsg, LocalDateTime.now()).toMinutes() : 0;
        String label = buildElapsedLabel(elapsed);

        NotificationReminderPayload payload = NotificationReminderPayload.builder()
                .conversationId(c.getId())
                .targetUserId(targetUserId)
                .elapsedMinutes(elapsed)
                .elapsedLabel(label)
                .priority("HIGH")
                .type("reminder")
                .message("You have an unanswered message " + label + " ago. Please check the conversation.")
                .build();

        sendReminderEvent(targetUserId, payload);
    }

    // ── Reminder — full rich payload ──────────────────────────────────

    /**
     * Core reminder dispatch with debouncing and idempotent delivery.
     * Emits a "reminder" SSE event carrying the full NotificationReminderPayload.
     */
    public void sendReminderEvent(Long targetUserId, NotificationReminderPayload payload) {
        String key = targetUserId + ":" + payload.getConversationId();
        LocalDateTime last = lastReminderAt.get(key);
        if (last != null && Duration.between(last, LocalDateTime.now()).compareTo(DEBOUNCE) < 0) {
            log.debug("Debounce: skipping reminder for user={} conv={}", targetUserId, payload.getConversationId());
            return;
        }
        lastReminderAt.put(key, LocalDateTime.now());

        log.info("[Reminder] user={} conv={} priority={} elapsed={}min type={}",
                targetUserId, payload.getConversationId(),
                payload.getPriority(), payload.getElapsedMinutes(), payload.getType());

        SseEmitter emitter = emitters.get(targetUserId);
        if (emitter == null) {
            log.debug("No active SSE connection for user {} — event logged only", targetUserId);
            return;
        }
        try {
            emitter.send(SseEmitter.event().name("reminder").data(payload));
        } catch (IOException e) {
            log.warn("Failed to send reminder SSE to user {}: {}", targetUserId, e.getMessage());
            emitters.remove(targetUserId);
        }
    }

    // ── Login reminders — batch dispatch ─────────────────────────────

    /**
     * Fires all pre-computed login reminders for a user over SSE.
     * Called by NotificationController after /login-scan returns.
     * Each reminder still passes through the debounce check.
     */
    public void sendLoginReminders(Long userId, List<NotificationReminderPayload> reminders) {
        log.info("Dispatching {} login reminder(s) to user {}", reminders.size(), userId);
        for (NotificationReminderPayload p : reminders) {
            sendReminderEvent(userId, p);
        }
    }

    // ── Archive notice ────────────────────────────────────────────────

    /**
     * Notifies both participants that the conversation was auto-archived
     * (priority → LOW, type = "archived").
     */
    public void sendArchiveNotice(Conversation conversation) {
        log.info("[Archive] Conversation {} auto-archived (priority -> LOW)", conversation.getId());
        Map<String, Object> payload = Map.of(
                "conversationId", conversation.getId(),
                "type",           "archived",
                "priority",       "LOW",
                "message",        "This conversation was auto-archived due to inactivity."
        );
        sendEventToUser(conversation.getCreatorId(),  payload);
        sendEventToUser(conversation.getReceiverId(), payload);
    }

    // ── Private helpers ───────────────────────────────────────────────

    private void sendEventToUser(Long userId, Object payload) {
        if (userId == null) return;
        SseEmitter emitter = emitters.get(userId);
        if (emitter == null) return;
        try {
            emitter.send(SseEmitter.event().name("update").data(payload));
        } catch (IOException e) {
            log.warn("Failed to send SSE update to user {}: {}", userId, e.getMessage());
            emitters.remove(userId);
        }
    }

    /**
     * Converts a minute count to a human-readable elapsed label.
     * Public static so LoginCheckService can reuse it without circular injection.
     *
     * 0 → "moments" | 3 → "3 minutes" | 90 → "1 hour" | 2880 → "2 days"
     */
    public static String buildElapsedLabel(long minutes) {
        if (minutes < 1)  return "moments";
        if (minutes < 60) return minutes + " minute" + (minutes == 1 ? "" : "s");
        long hours = minutes / 60;
        if (hours < 24)   return hours  + " hour"   + (hours  == 1 ? "" : "s");
        long days  = minutes / 1440;
        return days  + " day"    + (days  == 1 ? "" : "s");
    }
}
