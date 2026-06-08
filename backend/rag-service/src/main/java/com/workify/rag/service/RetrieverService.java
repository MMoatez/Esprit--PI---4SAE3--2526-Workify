package com.workify.rag.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.List;

@Slf4j
@Service
public class RetrieverService {

    @Autowired
    private IndexService indexService;

    @Value("${rag.retriever.topk:6}")
    private int topK;

    /**
     * Récupère les snippets les plus pertinents pour une query
     * @param query      message de l'utilisateur
     * @param userRole   FREELANCER | CLIENT | ADMIN
     * @return context string prêt pour le LLM
     */
    public String retrieve(String query, String userRole) {
        if (query == null || query.isBlank()) return "";

        List<String> chunks = indexService.search(query, topK, userRole);

        if (chunks.isEmpty()) {
            log.debug("⚠️ No relevant chunks found for query: {}", query);
            return "";
        }

        log.debug("✅ Retrieved {} chunks for role {}", chunks.size(), userRole);

        // Assembler le contexte pour le LLM
        StringBuilder context = new StringBuilder();
        for (int i = 0; i < chunks.size(); i++) {
            context.append("[").append(i + 1).append("] ").append(chunks.get(i)).append("\n\n");
        }

        return context.toString().trim();
    }
}