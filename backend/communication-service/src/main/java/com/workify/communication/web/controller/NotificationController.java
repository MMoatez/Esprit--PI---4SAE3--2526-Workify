package com.workify.communication.web.controller;

import com.workify.communication.service.LoginCheckService;
import com.workify.communication.service.NotificationService;
import com.workify.communication.web.dto.NotificationReminderPayload;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;

@RestController
@CrossOrigin(origins = "http://localhost:4200")
@RequiredArgsConstructor
@Slf4j
public class NotificationController {

    private final NotificationService notificationService;
    private final LoginCheckService   loginCheckService;

    /**
     * Subscribe to server-sent events for a user.
     * Client example (JS):
     *   const es = new EventSource('/api/notifications/subscribe?userId=123');
     *   es.addEventListener('reminder', e => console.log(JSON.parse(e.data)));
     */
    @GetMapping(path = "/api/notifications/subscribe", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter subscribe(@RequestParam Long userId) {
        log.info("SSE subscribe for user {}", userId);
        return notificationService.subscribe(userId);
    }

    /**
     * POST /api/notifications/login-scan?userId={id}
     *
     * Called by the Angular frontend immediately after a successful login.
     * Scans ALL conversations (active, archived, blocked) for unanswered messages,
     * corrects their priority according to elapsed time, and returns a list of
     * reminder payloads so the frontend can display toast notifications.
     *
     * If the user's SSE connection is already open, each reminder is also pushed
     * over the wire via sendLoginReminders() — this handles the race where the
     * tab was open before the login completed.
     *
     * Priority rules applied:
     *   elapsed > 5 min  → LOW  (yellow motif)
     *   elapsed > 1 min  → HIGH (red motif)
     *   elapsed ≤ 1 min  → MEDIUM (orange motif)
     *
     * Rate-limiting: individual reminders respect the 2-minute debounce in
     * NotificationService so rapid page refreshes cannot spam the user.
     */
    @PostMapping("/api/notifications/login-scan")
    public ResponseEntity<List<NotificationReminderPayload>> loginScan(@RequestParam Long userId) {
        log.info("POST /api/notifications/login-scan — userId={}", userId);
        List<NotificationReminderPayload> reminders = loginCheckService.computeLoginReminders(userId);
        // Also push over SSE if the user is already connected
        notificationService.sendLoginReminders(userId, reminders);
        return ResponseEntity.ok(reminders);
    }
}
