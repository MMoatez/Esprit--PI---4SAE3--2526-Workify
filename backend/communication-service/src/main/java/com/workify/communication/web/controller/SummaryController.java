package com.workify.communication.web.controller;

import com.workify.communication.domain.Message;
import com.workify.communication.enums.ContentType;
import com.workify.communication.enums.DeliveryStatus;
import com.workify.communication.repository.MessageRepository;
import com.workify.communication.service.RagClient;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@Slf4j
@RestController
@RequestMapping("/api/conversations")
@CrossOrigin(origins = "http://localhost:4200")
public class SummaryController {

    @Autowired
    private MessageRepository messageRepository;

    @Autowired
    private RagClient ragClient;

    /**
     * GET /api/conversations/{id}/summary?userId={userId}
     *
     * Builds a rich context from ALL message types then asks the LLM to summarise.
     * Falls back to a detailed rule-based description when the LLM returns empty.
     */
    @GetMapping("/{id}/summary")
    public ResponseEntity<Map<String, String>> getSummary(
            @PathVariable Long id,
            @RequestParam Long userId) {

        List<Message> messages = messageRepository.findByConversationIdForUser(id, userId);
        if (messages.isEmpty()) {
            return ResponseEntity.ok(Map.of("summary", "No messages found in this conversation."));
        }

        // Work with the last 60 messages
        List<Message> relevant = messages.size() > 60
                ? messages.subList(messages.size() - 60, messages.size())
                : messages;

        // ── Build rich context (all content types) ───────────────────────
        StringBuilder context = new StringBuilder();
        int voiceCount = 0, fileCount = 0, imageCount = 0, videoCount = 0;
        int missedCalls = 0, completedCalls = 0, declinedCalls = 0;
        int blockedCount = 0;
        List<String> textSnippets = new ArrayList<>();

        for (Message m : relevant) {
            if (Boolean.TRUE.equals(m.getIsDeleted())) continue;

            ContentType    ct = m.getContentType() != null ? m.getContentType() : ContentType.TEXT;
            DeliveryStatus ds = m.getDeliveryStatus();

            if (ds == DeliveryStatus.BLOCKED) {
                blockedCount++;
                context.append("[A message was blocked due to a policy violation]\n");
                continue;
            }

            switch (ct) {
                case TEXT -> {
                    String c = m.getContent();
                    if (c != null && !c.isBlank() && !c.trim().startsWith("{")) {
                        String snippet = c.trim();
                        textSnippets.add(snippet);
                        context.append("User ").append(m.getSenderId())
                               .append(": ").append(snippet).append("\n");
                    }
                }
                case RECORD -> {
                    voiceCount++;
                    context.append("[Voice message from User ").append(m.getSenderId()).append("]\n");
                }
                case FILE -> {
                    fileCount++;
                    context.append("[File shared by User ").append(m.getSenderId()).append("]\n");
                }
                case IMAGE -> {
                    imageCount++;
                    context.append("[Image shared by User ").append(m.getSenderId()).append("]\n");
                }
                case VIDEO -> {
                    videoCount++;
                    context.append("[Video shared by User ").append(m.getSenderId()).append("]\n");
                }
                case CALL -> {
                    String callInfo = m.getContent() != null ? m.getContent() : "";
                    if (callInfo.contains("missed") || callInfo.contains("canceled")) {
                        missedCalls++;
                        context.append("[A call was missed or canceled]\n");
                    } else if (callInfo.contains("completed")) {
                        completedCalls++;
                        context.append("[A call was completed]\n");
                    } else if (callInfo.contains("declined")) {
                        declinedCalls++;
                        context.append("[A call was declined]\n");
                    } else {
                        missedCalls++;
                        context.append("[A call event occurred]\n");
                    }
                }
                default -> { /* ignore unknown types */ }
            }
        }

        String contextText = context.toString().trim();
        if (contextText.isEmpty()) {
            return ResponseEntity.ok(Map.of("summary", "No content available to summarize."));
        }

        log.info("📝 Summary conv={} — {} chars | texts={} voice={} file={} image={} missed={} completed={} declined={} blocked={}",
                id, contextText.length(), textSnippets.size(),
                voiceCount, fileCount, imageCount, missedCalls, completedCalls, declinedCalls, blockedCount);

        // ── Try LLM ──────────────────────────────────────────────────────
        String summary = ragClient.getSummary(contextText);

        // ── Detailed rule-based fallback if LLM is empty ─────────────────
        if (summary.isBlank()) {
            summary = buildDetailedFallback(textSnippets, voiceCount, fileCount,
                    imageCount, videoCount, missedCalls, completedCalls, declinedCalls, blockedCount);
        }

        return ResponseEntity.ok(Map.of("summary", summary));
    }

    /**
     * Returns true if a text snippet is "meaningful" — must have at least
     * 2 real words (≥ 3 chars each).
     */
    private boolean isMeaningful(String text) {
        if (text == null) return false;
        String stripped = text.replaceAll("[^\\p{L}\\p{N}\\s]", "").trim();
        if (stripped.length() < 10) return false;
        long realWords = Arrays.stream(stripped.split("\\s+"))
                .filter(w -> w.length() >= 3)
                .count();
        return realWords >= 2;
    }

    /**
     * Builds a detailed, multi-sentence natural summary.
     * Differentiates missed / completed / declined calls, quotes meaningful topics,
     * lists all media types, and adds a policy note for blocked content.
     *
     * Example outputs:
     *   "One participant wanted to discuss the current project status.
     *    They also exchanged 2 voice messages and 1 file.
     *    3 calls were attempted but went unanswered or were canceled."
     *
     *   "The participants exchanged 2 voice messages during this conversation.
     *    A phone call was completed successfully."
     */
    private String buildDetailedFallback(List<String> texts, int voice, int file,
                                          int image, int video,
                                          int missed, int completed, int declined,
                                          int blocked) {

        List<String> sentences = new ArrayList<>();

        // ── 1. Text topics ────────────────────────────────────────────────
        String firstTopic = texts.stream().filter(this::isMeaningful).findFirst().orElse(null);
        String lastTopic  = texts.stream().filter(this::isMeaningful).reduce((a, b) -> b).orElse(null);

        if (firstTopic != null) {
            String ft = firstTopic.length() > 100 ? firstTopic.substring(0, 100) + "…" : firstTopic;
            if (lastTopic != null && !lastTopic.equals(firstTopic)) {
                String lt = lastTopic.length() > 80 ? lastTopic.substring(0, 80) + "…" : lastTopic;
                sentences.add("The participants discussed: \"" + ft + "\", and later: \"" + lt + "\".");
            } else {
                sentences.add("The participants discussed: \"" + ft + "\".");
            }
        }

        // ── 2. Media exchanges ────────────────────────────────────────────
        List<String> mediaItems = new ArrayList<>();
        if (voice > 0) mediaItems.add(voice + " voice message" + (voice > 1 ? "s" : ""));
        if (image > 0) mediaItems.add(image + " image"         + (image > 1 ? "s" : ""));
        if (file  > 0) mediaItems.add(file  + " file"          + (file  > 1 ? "s" : ""));
        if (video > 0) mediaItems.add(video + " video"         + (video > 1 ? "s" : ""));

        if (!mediaItems.isEmpty()) {
            String mediaList = joinList(mediaItems);
            if (firstTopic != null) {
                sentences.add("They also exchanged " + mediaList + ".");
            } else {
                sentences.add("The participants exchanged " + mediaList + " during this conversation.");
            }
        }

        // ── 3. Call events ────────────────────────────────────────────────
        int totalCalls = missed + completed + declined;
        if (totalCalls > 0) {
            if (completed > 0 && missed == 0 && declined == 0) {
                sentences.add(completed == 1
                        ? "A phone call was completed successfully."
                        : completed + " phone calls were completed successfully.");
            } else if (missed > 0 && completed == 0 && declined == 0) {
                sentences.add(missed == 1
                        ? "A call was attempted but went unanswered or was canceled."
                        : missed + " calls were attempted but went unanswered or were canceled.");
            } else if (declined > 0 && completed == 0 && missed == 0) {
                sentences.add(declined == 1
                        ? "A call was declined."
                        : declined + " calls were declined.");
            } else {
                // Mixed call types
                List<String> callParts = new ArrayList<>();
                if (completed > 0) callParts.add(completed + " completed");
                if (missed    > 0) callParts.add(missed    + " missed or canceled");
                if (declined  > 0) callParts.add(declined  + " declined");
                sentences.add("Phone calls were made: " + joinList(callParts) + ".");
            }
        }

        // ── 4. Blocked content ────────────────────────────────────────────
        if (blocked > 0) {
            sentences.add((blocked == 1 ? "One message was" : blocked + " messages were")
                    + " blocked due to a policy violation.");
        }

        // ── 5. Absolute fallback ──────────────────────────────────────────
        if (sentences.isEmpty()) {
            return "The participants had a brief conversation.";
        }

        return String.join(" ", sentences);
    }

    /** Joins a list with commas and "and" before the last element. */
    private String joinList(List<String> items) {
        if (items.size() == 1) return items.get(0);
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < items.size(); i++) {
            if (i > 0 && i == items.size() - 1) sb.append(" and ");
            else if (i > 0) sb.append(", ");
            sb.append(items.get(i));
        }
        return sb.toString();
    }
}
