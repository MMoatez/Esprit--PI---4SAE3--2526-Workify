package com.workify.rag.controller;

import com.workify.rag.service.LlmService;
import com.workify.rag.service.RagService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/rag")
@CrossOrigin(origins = "*")
public class RagController {

    @Autowired
    private RagService ragService;

    @Autowired
    private LlmService llmService;

    // ── SUGGEST ───────────────────────────────────────────────────
    /**
     * POST /api/rag/suggest
     * Body: { "message": "...", "userRole": "FREELANCER", "conversationId": 42 }
     * Response: { "suggestions": ["..."], "context": "..." }
     */
    @PostMapping("/suggest")
    public ResponseEntity<Map<String, Object>> suggest(@RequestBody Map<String, Object> body) {
        String message        = (String) body.getOrDefault("message", "");
        String userRole       = (String) body.getOrDefault("userRole", "CLIENT");
        Long   conversationId = body.get("conversationId") != null
            ? Long.valueOf(body.get("conversationId").toString()) : null;

        if (message.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "message is required"));
        }

        String suggestion = ragService.suggest(message, userRole);

        return ResponseEntity.ok(Map.of(
            "suggestions",    List.of(suggestion),
            "userRole",       userRole,
            "conversationId", conversationId != null ? conversationId : 0,
            "indexSize",      ragService.getIndexSize()
        ));
    }

    // ── INGEST MESSAGE ────────────────────────────────────────────
    /**
     * POST /api/rag/ingest/message
     * Body: { "conversationId": 42, "messageId": 10, "content": "...", "senderRole": "FREELANCER" }
     */
    @PostMapping("/ingest/message")
    public ResponseEntity<Map<String, Object>> ingestMessage(@RequestBody Map<String, Object> body) {
        Long   conversationId = Long.valueOf(body.get("conversationId").toString());
        Long   messageId      = Long.valueOf(body.get("messageId").toString());
        String content        = (String) body.get("content");
        String senderRole     = (String) body.getOrDefault("senderRole", "UNKNOWN");

        ragService.ingestMessage(conversationId, messageId, content, senderRole);

        return ResponseEntity.ok(Map.of(
            "status",    "indexed",
            "indexSize", ragService.getIndexSize()
        ));
    }

    // ── INGEST PROJECT ────────────────────────────────────────────
    /**
     * POST /api/rag/ingest/project
     */
    @PostMapping("/ingest/project")
    public ResponseEntity<Map<String, Object>> ingestProject(@RequestBody Map<String, Object> body) {
        Long   projectId    = Long.valueOf(body.get("projectId").toString());
        String title        = (String) body.getOrDefault("title", "Untitled");
        String status       = (String) body.getOrDefault("status", "UNKNOWN");
        String deadline     = (String) body.getOrDefault("deadline", "N/A");
        int    progress     = Integer.parseInt(body.getOrDefault("progress", 0).toString());
        Long   freelancerId = Long.valueOf(body.getOrDefault("freelancerId", 0).toString());
        Long   clientId     = Long.valueOf(body.getOrDefault("clientId", 0).toString());

        ragService.ingestProject(projectId, title, status, deadline, progress, freelancerId, clientId);

        return ResponseEntity.ok(Map.of("status", "indexed", "projectId", projectId));
    }

    // ── INGEST OFFER ──────────────────────────────────────────────
    /**
     * POST /api/rag/ingest/offer
     */
    @PostMapping("/ingest/offer")
    public ResponseEntity<Map<String, Object>> ingestOffer(@RequestBody Map<String, Object> body) {
        Long   offerId      = Long.valueOf(body.get("offerId").toString());
        String description  = (String) body.getOrDefault("description", "");
        Long   freelancerId = Long.valueOf(body.getOrDefault("freelancerId", 0).toString());
        Long   projectId    = Long.valueOf(body.getOrDefault("projectId", 0).toString());
        String status       = (String) body.getOrDefault("status", "PENDING");

        ragService.ingestOffer(offerId, description, freelancerId, projectId, status);

        return ResponseEntity.ok(Map.of("status", "indexed", "offerId", offerId));
    }

    // ── SUMMARIZE ─────────────────────────────────────────────────
    /**
     * POST /api/rag/summarize
     * Body: { "messages": "User A: hello\nUser B: hi\n..." }
     * Response: { "summary": "..." }
     */
    @PostMapping("/summarize")
    public ResponseEntity<Map<String, Object>> summarize(@RequestBody Map<String, Object> body) {
        String messagesText = (String) body.getOrDefault("messages", "");
        if (messagesText.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "messages is required"));
        }
        String summary = llmService.generateSummary(messagesText);
        return ResponseEntity.ok(Map.of(
            "summary", summary.isBlank() ? "" : summary
        ));
    }

    // ── HEALTH ────────────────────────────────────────────────────
    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> health() {
        return ResponseEntity.ok(Map.of(
            "status",    "UP",
            "indexSize", ragService.getIndexSize(),
            "service",   "rag-engine"
        ));
    }
}