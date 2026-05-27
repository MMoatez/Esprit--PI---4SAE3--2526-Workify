package com.workify.projectservice.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.workify.projectservice.domains.Project;
import com.workify.projectservice.domains.ProjectComplexity;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

@Service
public class EstimationService {

    @Value("${groq.api.key}")
    private String groqApiKey;

    private static final String GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
    private static final String MODEL    = "llama-3.1-8b-instant";

    private final RestClient restClient = RestClient.create();
    private final ObjectMapper mapper   = new ObjectMapper();

    // ─── Duration ────────────────────────────────────────────────────────────
    public Integer estimateDuration(Project project) {
        String raw = callGroq(buildPrompt(project, "duration"));
        try {
            return Integer.parseInt(raw.replaceAll("[^0-9]", "").trim());
        } catch (NumberFormatException e) {
            return fallbackDuration(project);
        }
    }

    // ─── Complexity ──────────────────────────────────────────────────────────
    public ProjectComplexity estimateComplexity(Project project) {
        String raw = callGroq(buildPrompt(project, "complexity")).toUpperCase();
        for (ProjectComplexity c : ProjectComplexity.values()) {
            if (raw.contains(c.name())) return c;
        }
        return ProjectComplexity.MEDIUM;
    }

    // ─── Prompt Builder ───────────────────────────────────────────────────────
    private String buildPrompt(Project project, String type) {
        String ctx = String.format(
                "Project title: %s\nCategory: %s\nDescription: %s\nBudget: %s",
                project.getTitle() != null ? project.getTitle() : "N/A",
                project.getCategory() != null ? project.getCategory().name() : "N/A",
                project.getDetailedDescription() != null ? project.getDetailedDescription() : "N/A",
                project.getBudget() != null ? "$" + project.getBudget() : "Not specified"
        );

        if ("duration".equals(type)) {
            return ctx + "\n\n" +
                    "You are a senior software project manager. Based on the project details above, " +
                    "estimate a realistic duration in WORKING DAYS to complete this project from scratch by a skilled freelancer team.\n" +
                    "Consider: project scope, category complexity, description detail, and budget constraints.\n" +
                    "Reply with ONLY a single integer number — no units, no explanation, no punctuation.\n" +
                    "Example: 34";
        } else {
            return ctx + "\n\n" +
                    "You are a senior software project manager. Classify this project's complexity.\n" +
                    "SIMPLE = clear scope, standard tech, < 3 weeks.\n" +
                    "MEDIUM = moderate features, some integrations, 3–8 weeks.\n" +
                    "COMPLEX = multiple systems, advanced features, unclear scope, or 8+ weeks.\n" +
                    "Reply with ONLY one word: SIMPLE, MEDIUM, or COMPLEX — nothing else.";
        }
    }

    // ─── Groq Call via RestClient ─────────────────────────────────────────────
    private String callGroq(String prompt) {
        try {
            String requestBody = mapper.writeValueAsString(
                    mapper.createObjectNode()
                            .put("model", MODEL)
                            .put("temperature", 0.2)
                            .set("messages", mapper.createArrayNode()
                                    .add(mapper.createObjectNode()
                                            .put("role", "user")
                                            .put("content", prompt)
                                    )
                            )
            );

            String response = restClient.post()
                    .uri(GROQ_URL)
                    .header("Content-Type", "application/json")
                    .header("Authorization", "Bearer " + groqApiKey)
                    .body(requestBody)
                    .retrieve()
                    .body(String.class);

            JsonNode root = mapper.readTree(response);
            return root
                    .path("choices").get(0)
                    .path("message")
                    .path("content")
                    .asText()
                    .trim();

        } catch (Exception e) {
            return "";
        }
    }

    // ─── Fallbacks (if Groq is unavailable) ──────────────────────────────────
    private Integer fallbackDuration(Project project) {
        return switch (project.getCategory()) {
            case APPLICATION_MOBILE -> 45;
            case ECOMMERCE, DEVELOPPEMENT_SPECIFIQUE -> 40;
            case SITE_WEB, VIDEO -> 30;
            case MARKETING -> 25;
            default -> 20;
        };
    }

    private ProjectComplexity fallbackComplexity(Project project) {
        return ProjectComplexity.MEDIUM;
    }
}