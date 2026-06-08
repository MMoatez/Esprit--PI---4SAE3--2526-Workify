package com.workify.rag.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import jakarta.annotation.PostConstruct;
import java.util.Collections;
import java.util.List;

@Slf4j
@Service
public class LlmService {

    // ✅ Fix: lire directement depuis System properties en fallback
    @Value("${rag.llm.api.key:${RAG_LLM_API_KEY:}}")
    private String apiKey;

    @Value("${rag.llm.model:google/flan-t5-base}")
    private String model;

    /** flan-t5-xl — 3B encoder-decoder, free HuggingFace tier, produces natural summaries. */
    @Value("${rag.summary.model:google/flan-t5-xl}")
    private String summaryModel;

    @PostConstruct
    public void init() {
        // Debug: afficher la valeur exacte lue
        log.info("🔑 LlmService apiKey raw value: '{}'",
                apiKey != null ? apiKey.substring(0, Math.min(12, apiKey.length())) + "..." : "NULL");

        if (apiKey == null || apiKey.isBlank()) {
            log.warn("⚠️ rag.llm.api.key is EMPTY — LLM will use fallback");
        } else {
            log.info("✅ LlmService ready — model: {} — key: {}...",
                    model, apiKey.substring(0, Math.min(10, apiKey.length())));
        }
    }

    // ── SUMMARIZE (flan-t5-xl) ────────────────────────────────────
    /**
     * Uses google/flan-t5-xl — a 3B encoder-decoder model, fully available on the
     * HuggingFace free inference tier.  Flan-T5 is instruction-tuned and understands
     * plain-text summarization prompts directly (no [INST] tags needed).
     * Response key is "generated_text" (same as flan-t5-base).
     */
    public String generateSummary(String messagesText) {
        if (apiKey == null || apiKey.isBlank()) {
            log.warn("⚠️ No LLM key — cannot generate summary");
            return "";
        }

        // Flan-T5 handles ~512 tokens comfortably; cap to keep it clean
        String input = messagesText.length() > 1200
                ? messagesText.substring(0, 1200) : messagesText;

        String url = "https://api-inference.huggingface.co/models/" + summaryModel;

        // Plain instruction prompt — flan-t5 does NOT use [INST] tags
        String prompt = "Summarize the following chat conversation in 2 to 3 natural English sentences. "
                + "Describe what was discussed and what media was shared. Skip greetings and fillers.\n\n"
                + "Conversation:\n" + input + "\n\nSummary:";

        String escaped = prompt
                .replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\n", "\\n")
                .replace("\r", "");

        // Flan-T5 is encoder-decoder: use max_new_tokens only (NO temperature/do_sample)
        String jsonBody = "{"
                + "\"inputs\":\"" + escaped + "\","
                + "\"parameters\":{\"max_new_tokens\":120},"
                + "\"options\":{\"wait_for_model\":true,\"use_cache\":false}"
                + "}";

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(apiKey);
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setAccept(Collections.singletonList(MediaType.APPLICATION_JSON));

        try {
            log.info("📤 flan-t5-xl Summary → {} ({} chars input)", url, input.length());
            ResponseEntity<List> response = new RestTemplate().exchange(
                    url, HttpMethod.POST, new HttpEntity<>(jsonBody, headers), List.class);
            log.info("📥 flan-t5-xl status: {}", response.getStatusCode());
            List<?> result = response.getBody();
            if (result != null && !result.isEmpty()) {
                Object first = result.get(0);
                if (first instanceof java.util.Map<?, ?> map) {
                    String generated = (String) map.get("generated_text");
                    if (generated != null && !generated.isBlank()) {
                        log.info("✅ flan-t5-xl summary ({} chars): {}", generated.length(),
                                generated.substring(0, Math.min(80, generated.length())));
                        return cleanSummary(generated);
                    }
                }
                if (first instanceof String s && !s.isBlank()) return cleanSummary(s);
            }
        } catch (org.springframework.web.client.HttpClientErrorException e) {
            log.error("❌ flan-t5-xl API {} — response: {}", e.getStatusCode(), e.getResponseBodyAsString());
        } catch (Exception e) {
            log.error("❌ flan-t5-xl Summary error: {}", e.getMessage());
        }
        return "";
    }

    private String cleanSummary(String text) {
        if (text == null) return "";
        // Strip any leftover instruction tags
        text = text.replaceAll("\\[/?INST]", "").replaceAll("<s>|</s>", "").trim();
        // Remove leading labels like "Summary:" that the model might echo
        text = text.replaceAll("(?i)^(summary:|answer:)\\s*", "").trim();
        // Cap at 4 sentences
        String[] sentences = text.split("(?<=[.!?])\\s+");
        if (sentences.length > 4)
            text = String.join(" ", java.util.Arrays.copyOf(sentences, 4));
        return text.trim();
    }

    // ── GENERATE ──────────────────────────────────────────────────
    public String generate(String context, String userMessage, String userRole) {
        if (apiKey == null || apiKey.isBlank()) {
            log.warn("⚠️ No LLM key — fallback");
            return templateFallback(context, userMessage);
        }
        log.info("🤖 Calling HuggingFace — key: {}...", apiKey.substring(0, 8));
        return callHuggingFace(context, userMessage, userRole);
    }

    // ── HUGGINGFACE API ───────────────────────────────────────────
    private String callHuggingFace(String context, String userMessage, String userRole) {
        // Stable inference API — no extra auth requirements (unlike router.huggingface.co)
        String url = "https://api-inference.huggingface.co/models/" + model;
        String prompt = buildPrompt(context, userMessage, userRole);

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(apiKey);
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setAccept(Collections.singletonList(MediaType.APPLICATION_JSON));

        String escapedPrompt = prompt.replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\n", "\\n");

        // flan-t5 is an encoder-decoder (text2text) model — temperature/do_sample
        // are NOT supported and cause 422 errors on this model class.
        String jsonBody = "{"
                + "\"inputs\":\"" + escapedPrompt + "\","
                + "\"parameters\":{"
                +   "\"max_new_tokens\":120"
                + "},"
                + "\"options\":{"
                +   "\"wait_for_model\":true,"
                +   "\"use_cache\":false"
                + "}"
                + "}";

        HttpEntity<String> request = new HttpEntity<>(jsonBody, headers);

        try {
            log.info("📤 LLM → {}", url);
            RestTemplate rt = new RestTemplate();
            ResponseEntity<List> response = rt.exchange(
                    url, HttpMethod.POST, request, List.class
            );
            log.info("📥 LLM status: {}", response.getStatusCode());

            List<?> result = response.getBody();
            if (result != null && !result.isEmpty()) {
                Object first = result.get(0);
                if (first instanceof java.util.Map<?, ?> map) {
                    String generated = (String) map.get("generated_text");
                    if (generated != null && !generated.isBlank()) {
                        log.info("✅ Generated ({} chars)", generated.length());
                        return cleanResponse(generated);
                    }
                }
                if (first instanceof String s && !s.isBlank()) {
                    return cleanResponse(s);
                }
            }
        } catch (Exception e) {
            log.error("❌ HuggingFace LLM error: {}", e.getMessage());
        }

        return templateFallback(context, userMessage);
    }

    // ── PROMPT ────────────────────────────────────────────────────
    private String buildPrompt(String context, String userMessage, String userRole) {
        String roleInstruction = switch (userRole) {
            case "FREELANCER" -> "You are assisting a FREELANCER. Focus on: tasks, deadlines, deliverables, payment.";
            case "CLIENT"     -> "You are assisting a CLIENT. Focus on: project progress, delivery dates, budget.";
            case "ADMIN"      -> "You are assisting a PLATFORM ADMIN with full access to all project data.";
            default           -> "You are a helpful assistant on a freelancer project platform.";
        };

        return roleInstruction + "\n\nContext: "
                + (context.isBlank() ? "No specific context available." : context)
                + "\n\nQuestion: " + userMessage
                + "\n\nAnswer:";
    }

    // ── CLEAN ─────────────────────────────────────────────────────
    private String cleanResponse(String text) {
        if (text == null) return "";
        text = text.replaceAll("\\[/?INST]", "").trim();
        text = text.replaceAll("<s>|</s>", "").trim();
        String[] sentences = text.split("(?<=[.!?])\\s+");
        if (sentences.length > 3)
            text = String.join(" ", java.util.Arrays.copyOf(sentences, 3));
        return text.trim();
    }

    // ── FALLBACK ──────────────────────────────────────────────────
    // Returns empty string so the caller (SuggestionController) can apply its own
    // smart fallback instead of showing a confusing "no context" message to the user.
    private String templateFallback(String context, String userMessage) {
        if (context != null && !context.isBlank()) {
            // RAG retrieved context but LLM failed → return context snippet directly
            return context.substring(0, Math.min(180, context.length())).trim();
        }
        return ""; // empty = no useful answer; caller will use its own fallback
    }
}