package com.workify.rag.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import jakarta.annotation.PostConstruct;
import java.util.Collections;
import java.util.Map;

@Slf4j
@Service
public class EmbedderService {

    @Value("${rag.embedding.api.key:}")
    private String apiKey;

    @Value("${rag.embedding.model:sentence-transformers/all-MiniLM-L6-v2}")
    private String model;

    private static final int EMBEDDING_DIM = 384;

    @PostConstruct
    public void init() {
        if (apiKey == null || apiKey.isBlank()) {
            log.warn("⚠️ rag.embedding.api.key is EMPTY — using stub embedder");
        } else {
            log.info("✅ EmbedderService ready — model: {} — key: {}...",
                    model, apiKey.substring(0, Math.min(10, apiKey.length())));
        }
    }

    // ── EMBED ─────────────────────────────────────────────────────
    public float[] embed(String text) {
        if (text == null || text.isBlank()) return new float[EMBEDDING_DIM];
        if (apiKey == null || apiKey.isBlank()) {
            return stubEmbed(text);
        }
        return callHuggingFace(text);
    }

    // ── HUGGINGFACE API ───────────────────────────────────────────
    private float[] callHuggingFace(String text) {
        String url = "https://router.huggingface.co/hf-inference/models/"
                + model + "/pipeline/feature-extraction";

        // ✅ Fix: setContentType correct sans virgule
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(apiKey);
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setAccept(Collections.singletonList(MediaType.APPLICATION_JSON));

        String jsonBody = "{\"inputs\":\"" + text.replace("\"", "\\\"") + "\","
                + "\"options\":{\"wait_for_model\":true}}";

        HttpEntity<String> request = new HttpEntity<>(jsonBody, headers);

        try {
            log.info("📤 Embedding → {}", url);
            RestTemplate rt = new RestTemplate();
            ResponseEntity<Object> response = rt.exchange(
                    url, HttpMethod.POST, request, Object.class
            );
            log.info("📥 Embedding status: {}", response.getStatusCode());
            return parseEmbedding(response.getBody());
        } catch (Exception e) {
            log.error("❌ Embedding error: {} — stub fallback", e.getMessage());
            return stubEmbed(text);
        }
    }

    // ── PARSE ─────────────────────────────────────────────────────
    @SuppressWarnings("unchecked")
    private float[] parseEmbedding(Object responseBody) {
        try {
            if (responseBody instanceof java.util.List<?> list) {
                if (!list.isEmpty() && list.get(0) instanceof java.util.List<?> inner) {
                    return toFloatArray((java.util.List<Number>) inner);
                }
                return toFloatArray((java.util.List<Number>) list);
            }
        } catch (Exception e) {
            log.error("❌ Parse embedding failed: {}", e.getMessage());
        }
        return new float[EMBEDDING_DIM];
    }

    private float[] toFloatArray(java.util.List<Number> list) {
        float[] result = new float[list.size()];
        for (int i = 0; i < list.size(); i++) result[i] = list.get(i).floatValue();
        return result;
    }

    // ── STUB ──────────────────────────────────────────────────────
    private float[] stubEmbed(String text) {
        float[] v = new float[EMBEDDING_DIM];
        int hash = text.hashCode();
        for (int i = 0; i < EMBEDDING_DIM; i++)
            v[i] = (float) Math.sin(hash * (i + 1)) * 0.1f;
        return normalize(v);
    }

    // ── COSINE SIMILARITY ─────────────────────────────────────────
    public double cosineSimilarity(float[] a, float[] b) {
        if (a.length != b.length) return 0.0;
        double dot = 0, normA = 0, normB = 0;
        for (int i = 0; i < a.length; i++) {
            dot   += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }
        return (normA == 0 || normB == 0) ? 0 : dot / (Math.sqrt(normA) * Math.sqrt(normB));
    }

    private float[] normalize(float[] v) {
        double norm = 0;
        for (float x : v) norm += x * x;
        norm = Math.sqrt(norm);
        if (norm == 0) return v;
        for (int i = 0; i < v.length; i++) v[i] /= (float) norm;
        return v;
    }
}