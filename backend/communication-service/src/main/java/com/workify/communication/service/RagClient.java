package com.workify.communication.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

@Slf4j
@Component
public class RagClient {

    @Value("${rag.engine.url:http://localhost:8097}")
    private String ragUrl;

    @Value("${rag.engine.enabled:true}")
    private boolean enabled;

    private final RestTemplate restTemplate = new RestTemplate();

    // ── INGEST MESSAGE (async — ne bloque pas l'envoi) ────────────
    @Async
    public void ingestMessageAsync(Long conversationId, Long messageId,
                                    String content, String senderRole) {
        if (!enabled || content == null || content.isBlank()) return;
        try {
            Map<String, Object> body = Map.of(
                "conversationId", conversationId,
                "messageId",      messageId,
                "content",        content,
                "senderRole",     senderRole != null ? senderRole : "UNKNOWN"
            );
            post("/api/rag/ingest/message", body);
            log.debug("✅ RAG ingest: msg={}", messageId);
        } catch (Exception e) {
            log.warn("⚠️ RAG ingest failed (non-blocking): {}", e.getMessage());
        }
    }

    // ── INGEST PROJECT ────────────────────────────────────────────
    @Async
    public void ingestProjectAsync(Long projectId, String title, String status,
                                    String deadline, int progress,
                                    Long freelancerId, Long clientId) {
        if (!enabled) return;
        try {
            Map<String, Object> body = Map.of(
                "projectId",    projectId,
                "title",        title,
                "status",       status,
                "deadline",     deadline != null ? deadline : "N/A",
                "progress",     progress,
                "freelancerId", freelancerId,
                "clientId",     clientId
            );
            post("/api/rag/ingest/project", body);
            log.debug("✅ RAG ingest: project={}", projectId);
        } catch (Exception e) {
            log.warn("⚠️ RAG project ingest failed: {}", e.getMessage());
        }
    }

    // ── SUMMARIZE ─────────────────────────────────────────────────
    public String getSummary(String messagesText) {
        if (!enabled || messagesText == null || messagesText.isBlank()) return "";
        try {
            Map<String, Object> body = Map.of("messages", messagesText);
            ResponseEntity<Map> response = restTemplate.postForEntity(
                ragUrl + "/api/rag/summarize",
                new HttpEntity<>(body, jsonHeaders()),
                Map.class
            );
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                String summary = (String) response.getBody().get("summary");
                return summary != null ? summary : "";
            }
        } catch (Exception e) {
            log.warn("⚠️ RAG summarize failed: {}", e.getMessage());
        }
        return "";
    }

    // ── SUGGEST ───────────────────────────────────────────────────
    public String getSuggestion(String message, String userRole, Long conversationId) {
        if (!enabled) return "";
        try {
            Map<String, Object> body = Map.of(
                "message",        message,
                "userRole",       userRole != null ? userRole : "CLIENT",
                "conversationId", conversationId != null ? conversationId : 0
            );
            ResponseEntity<Map> response = restTemplate.postForEntity(
                ragUrl + "/api/rag/suggest",
                new HttpEntity<>(body, jsonHeaders()),
                Map.class
            );
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                var suggestions = (java.util.List<?>) response.getBody().get("suggestions");
                if (suggestions != null && !suggestions.isEmpty()) {
                    return (String) suggestions.get(0);
                }
            }
        } catch (Exception e) {
            log.warn("⚠️ RAG suggest failed: {}", e.getMessage());
        }
        return "";
    }

    // ── HEALTH CHECK ──────────────────────────────────────────────
    public boolean isHealthy() {
        try {
            ResponseEntity<Map> response = restTemplate.getForEntity(
                ragUrl + "/api/rag/health", Map.class
            );
            return response.getStatusCode().is2xxSuccessful();
        } catch (Exception e) {
            return false;
        }
    }

    // ── HELPERS ───────────────────────────────────────────────────
    private void post(String path, Map<String, Object> body) {
        restTemplate.postForEntity(
            ragUrl + path,
            new HttpEntity<>(body, jsonHeaders()),
            Map.class
        );
    }

    private HttpHeaders jsonHeaders() {
        HttpHeaders h = new HttpHeaders();
        h.setContentType(MediaType.APPLICATION_JSON);
        return h;
    }
}