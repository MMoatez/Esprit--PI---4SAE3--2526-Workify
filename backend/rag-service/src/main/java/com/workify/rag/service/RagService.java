package com.workify.rag.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.Map;

@Slf4j
@Service
public class RagService {

    @Autowired private EmbedderService embedderService;
    @Autowired private IndexService    indexService;
    @Autowired private RetrieverService retrieverService;
    @Autowired private LlmService      llmService;

    // ── INGEST ────────────────────────────────────────────────────

    /**
     * Indexer un message de conversation
     */
    public void ingestMessage(Long conversationId, Long messageId,
                               String content, String senderRole) {
        if (content == null || content.isBlank()) return;

        String sourceId = "conv-" + conversationId + "-msg-" + messageId;
        Map<String, String> metadata = Map.of(
            "conversationId", String.valueOf(conversationId),
            "messageId",      String.valueOf(messageId),
            "senderRole",     senderRole != null ? senderRole : "UNKNOWN",
            "visibility",     "ALL"
        );

        indexService.store("MESSAGE", sourceId, content, metadata);
        log.info("✅ Message indexed: conv={} msg={}", conversationId, messageId);
    }

    /**
     * Indexer un projet
     */
    public void ingestProject(Long projectId, String title, String status,
                               String deadline, int progress,
                               Long freelancerId, Long clientId) {
        String content = String.format(
            "Project: %s. Status: %s. Deadline: %s. Progress: %d%%. " +
            "FreelancerId: %d. ClientId: %d.",
            title, status, deadline, progress, freelancerId, clientId
        );

        Map<String, String> metadata = Map.of(
            "projectId",    String.valueOf(projectId),
            "freelancerId", String.valueOf(freelancerId),
            "clientId",     String.valueOf(clientId),
            "visibility",   "ALL"
        );

        indexService.store("PROJECT", String.valueOf(projectId), content, metadata);
        log.info("✅ Project indexed: id={} title={}", projectId, title);
    }

    /**
     * Indexer une offre
     */
    public void ingestOffer(Long offerId, String description,
                             Long freelancerId, Long projectId, String status) {
        String content = String.format(
            "Offer #%d: %s. Status: %s. FreelancerId: %d. ProjectId: %d.",
            offerId, description, status, freelancerId, projectId
        );

        Map<String, String> metadata = Map.of(
            "offerId",      String.valueOf(offerId),
            "freelancerId", String.valueOf(freelancerId),
            "projectId",    String.valueOf(projectId),
            "visibility",   "ALL"
        );

        indexService.store("OFFER", String.valueOf(offerId), content, metadata);
        log.info("✅ Offer indexed: id={}", offerId);
    }

    // ── SUGGEST ───────────────────────────────────────────────────

    /**
     * Pipeline complet: query → retrieve → LLM → suggestion
     * @param userMessage   message de l'utilisateur
     * @param userRole      FREELANCER | CLIENT | ADMIN
     * @return suggestion générée par le LLM
     */
    public String suggest(String userMessage, String userRole) {
        if (userMessage == null || userMessage.isBlank()) {
            return "";
        }

        log.info("🔍 RAG suggest: role={} query={}", userRole, userMessage);

        // 1. Retrieve relevant context
        String context = retrieverService.retrieve(userMessage, userRole);

        // 2. Generate response
        String suggestion = llmService.generate(context, userMessage, userRole);

        log.info("✅ RAG suggestion generated ({} chars)", suggestion.length());
        return suggestion;
    }

    // ── STATS ─────────────────────────────────────────────────────
    public int getIndexSize() {
        return indexService.size();
    }
}