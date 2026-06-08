package com.workify.communication.web.controller;

import com.workify.communication.domain.UserModeration;
import com.workify.communication.enums.ConversationStatus;
import com.workify.communication.repository.ConversationRepository;
import com.workify.communication.repository.MessageRepository;
import com.workify.communication.repository.UserModerationRepository;
import com.workify.communication.service.UserModerationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import org.springframework.data.domain.PageRequest;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@RestController
@RequestMapping("/api/admin/communication")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:4200")
public class AdminCommunicationController {

    private final ConversationRepository conversationRepository;
    private final MessageRepository      messageRepository;
    private final UserModerationRepository userModerationRepository;
    private final UserModerationService  userModerationService;

    /**
     * GET /api/admin/communication/stats
     * Returns global communication statistics for the admin dashboard.
     */
    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getStats() {
        var allConversations = conversationRepository.findAll();
        var allMessages      = messageRepository.findAll();
        var now              = LocalDateTime.now();

        // ── Conversations ─────────────────────────────────────────────────
        long totalConversations    = allConversations.size();
        long activeConversations   = allConversations.stream()
                .filter(c -> ConversationStatus.ACTIVE.equals(c.getStatus())).count();
        long blockedConversations  = allConversations.stream()
                .filter(c -> ConversationStatus.BLOCKED.equals(c.getStatus())).count();
        long archivedConversations = allConversations.stream()
                .filter(c -> ConversationStatus.ARCHIVED.equals(c.getStatus())).count();

        // ── Messages ──────────────────────────────────────────────────────
        long totalMessages   = allMessages.size();
        long textMessages    = allMessages.stream()
                .filter(m -> com.workify.communication.enums.ContentType.TEXT.equals(m.getContentType())).count();
        long voiceMessages   = allMessages.stream()
                .filter(m -> com.workify.communication.enums.ContentType.RECORD.equals(m.getContentType())).count();
        long fileMessages    = allMessages.stream()
                .filter(m -> com.workify.communication.enums.ContentType.FILE.equals(m.getContentType())).count();
        long imageMessages   = allMessages.stream()
                .filter(m -> com.workify.communication.enums.ContentType.IMAGE.equals(m.getContentType())).count();
        long callMessages    = allMessages.stream()
                .filter(m -> com.workify.communication.enums.ContentType.CALL.equals(m.getContentType())).count();
        long flaggedMessages = allMessages.stream()
                .filter(m -> Boolean.TRUE.equals(m.getIsFlagged())).count();
        long deletedMessages = allMessages.stream()
                .filter(m -> Boolean.TRUE.equals(m.getIsDeleted())).count();
        long readMessages    = allMessages.stream()
                .filter(m -> com.workify.communication.enums.DeliveryStatus.READ.equals(m.getDeliveryStatus())).count();

        // ── Moderation ────────────────────────────────────────────────────
        long currentlyBanned = userModerationRepository.findAll().stream()
                .filter(u -> u.getBannedUntil() != null && u.getBannedUntil().isAfter(now)).count();
        long totalViolations = userModerationRepository.findAll().stream()
                .mapToLong(u -> u.getPeriodViolations()).sum();

        // ── Read rate ──────────────────────────────────────────────────────
        double readRate = totalMessages > 0 ? Math.round((readMessages * 100.0 / totalMessages) * 10) / 10.0 : 0.0;

        // ── Avg messages per conversation ─────────────────────────────────
        double avgMsgPerConv = totalConversations > 0
                ? Math.round((totalMessages * 10.0 / totalConversations)) / 10.0 : 0.0;

        var result = new java.util.LinkedHashMap<String, Object>();
        result.put("totalConversations",    totalConversations);
        result.put("activeConversations",   activeConversations);
        result.put("blockedConversations",  blockedConversations);
        result.put("archivedConversations", archivedConversations);
        result.put("totalMessages",         totalMessages);
        result.put("textMessages",          textMessages);
        result.put("voiceMessages",         voiceMessages);
        result.put("fileMessages",          fileMessages);
        result.put("imageMessages",         imageMessages);
        result.put("callMessages",          callMessages);
        result.put("flaggedMessages",       flaggedMessages);
        result.put("deletedMessages",       deletedMessages);
        result.put("readMessages",          readMessages);
        result.put("readRate",              readRate);
        result.put("avgMsgPerConv",         avgMsgPerConv);
        result.put("currentlyBanned",       currentlyBanned);
        result.put("totalViolations",       totalViolations);
        return ResponseEntity.ok(result);
    }

    /**
     * GET /api/admin/communication/banned-users
     * Returns all currently banned users.
     */
    @GetMapping("/banned-users")
    public ResponseEntity<List<Map<String, Object>>> getBannedUsers() {
        List<Map<String, Object>> banned = userModerationRepository.findAll().stream()
                .filter(u -> u.getBannedUntil() != null && u.getBannedUntil().isAfter(LocalDateTime.now()))
                .map(u -> Map.<String, Object>of(
                        "userId",     u.getUserId(),
                        "bannedUntil", u.getBannedUntil().toString(),
                        "violations", u.getPeriodViolations()
                ))
                .collect(Collectors.toList());
        return ResponseEntity.ok(banned);
    }

    /**
     * DELETE /api/admin/communication/banned-users/{userId}
     * Lifts the ban for a specific user.
     */
    @DeleteMapping("/banned-users/{userId}")
    public ResponseEntity<Map<String, Object>> unbanUser(@PathVariable Long userId) {
        int cleared = userModerationService.clearBanForUser(userId);
        return ResponseEntity.ok(Map.of(
                "userId",  userId,
                "cleared", cleared,
                "message", cleared > 0 ? "Ban lifted for user " + userId : "No active ban found"
        ));
    }

    /**
     * DELETE /api/admin/communication/banned-users
     * Lifts ALL active bans.
     */
    @DeleteMapping("/banned-users")
    public ResponseEntity<Map<String, Object>> unbanAll() {
        int cleared = userModerationService.clearAllBans();
        return ResponseEntity.ok(Map.of(
                "cleared", cleared,
                "message", cleared + " ban(s) lifted"
        ));
    }

    /**
     * GET /api/admin/communication/health-score
     * Returns a platform health score (0–100) based on moderation metrics.
     */
    @GetMapping("/health-score")
    public ResponseEntity<Map<String, Object>> getHealthScore() {
        var allMessages      = messageRepository.findAll();
        var allConversations = conversationRepository.findAll();
        var now              = LocalDateTime.now();

        long total       = allMessages.size();
        long flagged     = allMessages.stream().filter(m -> Boolean.TRUE.equals(m.getIsFlagged())).count();
        long blocked     = allConversations.stream().filter(c -> ConversationStatus.BLOCKED.equals(c.getStatus())).count();
        long banned      = userModerationRepository.findAll().stream()
                .filter(u -> u.getBannedUntil() != null && u.getBannedUntil().isAfter(now)).count();
        long read        = allMessages.stream()
                .filter(m -> com.workify.communication.enums.DeliveryStatus.READ.equals(m.getDeliveryStatus())).count();

        double score = 100.0;
        if (total > 0) score -= Math.min(30, (flagged * 100.0 / total) * 3);
        score -= Math.min(20, blocked * 5);
        score -= Math.min(20, banned * 10);
        double readRate = total > 0 ? (read * 100.0 / total) : 100;
        if (readRate < 50) score -= 10;
        score = Math.max(0, Math.round(score));

        String status = score >= 80 ? "EXCELLENT" : score >= 60 ? "GOOD" : score >= 40 ? "WARNING" : "CRITICAL";

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("score", (long) score);
        result.put("status", status);
        result.put("flaggedRatio", total > 0 ? Math.round(flagged * 100.0 / total * 10) / 10.0 : 0.0);
        result.put("readRate",     total > 0 ? Math.round(read * 100.0 / total * 10) / 10.0 : 0.0);
        result.put("blockedConv",  blocked);
        result.put("bannedUsers",  banned);
        return ResponseEntity.ok(result);
    }

    /**
     * GET /api/admin/communication/hourly-activity
     * Returns message count per hour-of-day over the last 7 days (heatmap data).
     */
    @GetMapping("/hourly-activity")
    public ResponseEntity<List<Map<String, Object>>> getHourlyActivity() {
        LocalDateTime since = LocalDateTime.now().minusDays(7);
        List<Object[]> rows = messageRepository.countByHourSince(since);

        // Build a 24-slot array (0–23), fill with 0 by default
        long[] counts = new long[24];
        for (Object[] row : rows) {
            int hour  = ((Number) row[0]).intValue();
            long cnt  = ((Number) row[1]).longValue();
            counts[hour] = cnt;
        }

        long maxCount = Arrays.stream(counts).max().orElse(1);
        List<Map<String, Object>> result = new ArrayList<>();
        for (int h = 0; h < 24; h++) {
            Map<String, Object> slot = new LinkedHashMap<>();
            slot.put("hour",      h);
            slot.put("count",     counts[h]);
            slot.put("intensity", maxCount > 0 ? Math.round(counts[h] * 100.0 / maxCount) : 0);
            result.add(slot);
        }
        return ResponseEntity.ok(result);
    }

    /**
     * GET /api/admin/communication/velocity
     * Returns message count per day for the last 7 days (trend chart).
     */
    @GetMapping("/velocity")
    public ResponseEntity<List<Map<String, Object>>> getVelocity() {
        LocalDateTime since = LocalDateTime.now().minusDays(7);
        List<Object[]> rows = messageRepository.countByDaySince(since);
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("MMM dd");

        // Fill all 7 days (even empty ones)
        Map<String, Long> byDay = new LinkedHashMap<>();
        for (int i = 6; i >= 0; i--) {
            String key = LocalDateTime.now().minusDays(i).format(fmt);
            byDay.put(key, 0L);
        }
        for (Object[] row : rows) {
            try {
                String key = java.sql.Date.valueOf(row[0].toString())
                        .toLocalDate().atStartOfDay().format(fmt);
                byDay.put(key, ((Number) row[1]).longValue());
            } catch (Exception ignored) {}
        }

        long maxCount = byDay.values().stream().mapToLong(Long::longValue).max().orElse(1);
        List<Map<String, Object>> result = new ArrayList<>();
        byDay.forEach((day, count) -> {
            Map<String, Object> slot = new LinkedHashMap<>();
            slot.put("day",       day);
            slot.put("count",     count);
            slot.put("intensity", maxCount > 0 ? Math.round(count * 100.0 / maxCount) : 0);
            result.add(slot);
        });
        return ResponseEntity.ok(result);
    }

    /**
     * GET /api/admin/communication/top-users
     * Returns top 5 most active users by message count.
     */
    @GetMapping("/top-users")
    public ResponseEntity<List<Map<String, Object>>> getTopUsers() {
        List<Object[]> rows = messageRepository.findTopSenders(PageRequest.of(0, 5));
        List<Map<String, Object>> result = rows.stream().map(r -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("userId",       ((Number) r[0]).longValue());
            m.put("messageCount", ((Number) r[1]).longValue());
            return m;
        }).collect(Collectors.toList());
        return ResponseEntity.ok(result);
    }

    /**
     * GET /api/admin/communication/recent-violations
     * Returns the 8 most recent flagged messages.
     */
    @GetMapping("/recent-violations")
    public ResponseEntity<List<Map<String, Object>>> getRecentViolations() {
        List<Map<String, Object>> result = messageRepository
                .findRecentFlagged(PageRequest.of(0, 8))
                .stream().map(m -> {
                    Map<String, Object> item = new LinkedHashMap<>();
                    item.put("id",          m.getId());
                    item.put("senderId",    m.getSenderId());
                    item.put("convId",      m.getConversation() != null ? m.getConversation().getId() : null);
                    item.put("contentType", m.getContentType() != null ? m.getContentType().name() : "TEXT");
                    item.put("preview",     m.getContent() != null && m.getContent().length() > 80
                            ? m.getContent().substring(0, 80) + "…" : m.getContent());
                    item.put("createdAt",   m.getCreatedAt() != null ? m.getCreatedAt().toString() : null);
                    return item;
                }).collect(Collectors.toList());
        return ResponseEntity.ok(result);
    }
}
