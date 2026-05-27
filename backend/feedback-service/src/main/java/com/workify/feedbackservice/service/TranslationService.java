package com.workify.feedbackservice.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.workify.feedbackservice.domains.Feedback;
import com.workify.feedbackservice.domains.FeedbackTranslation;
import com.workify.feedbackservice.dto.FeedbackTranslationDto;
import com.workify.feedbackservice.repositories.FeedbackRepository;
import com.workify.feedbackservice.repositories.FeedbackTranslationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.List;
import java.util.Map;

/**
 * Language detection and translation service.
 *
 * Detection  : HuggingFace — papluca/xlm-roberta-base-language-detection
 * Translation: MyMemory free API (api.mymemory.translated.net) — 100+ languages, no key needed
 *
 * Translation cache: stored in DB (FeedbackTranslation) — one row per (feedbackId, targetLang).
 * If source == target → return original text unchanged (no API call).
 * Texts over 500 chars are chunked at sentence boundaries.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class TranslationService {

    @Value("${huggingface.api.key:}")
    private String hfApiKey;

    private final FeedbackRepository            feedbackRepo;
    private final FeedbackTranslationRepository translationRepo;

    private final ObjectMapper objectMapper = new ObjectMapper();

    private static final String HF_DETECT =
            "https://router.huggingface.co/hf-inference/models/papluca/xlm-roberta-base-language-detection/pipeline/text-classification";

    /**
     * MyMemory free translation API — no API key needed, supports 100+ languages.
     * Limit: 500 chars/request on the free tier (longer text is trimmed for translation).
     */
    private static final String MYMEMORY_URL = "https://api.mymemory.translated.net/get";

    /** Maps our 2-letter codes to MyMemory/BCP-47 language tags where they differ */
    private static final Map<String, String> MYMEMORY_CODES = Map.of(
            "zh", "zh-CN"   // Simplified Chinese
    );

    // ── Public API ─────────────────────────────────────────────────────────────

    /**
     * Detects and stores the source language of a feedback comment asynchronously.
     * Called after transaction commits so the feedback row is visible.
     */
    @Async
    @Transactional
    public void detectAndStoreLangAsync(Long feedbackId) {
        try {
            Feedback fb = feedbackRepo.findById(feedbackId).orElse(null);
            if (fb == null || fb.getComment() == null || fb.getSourceLang() != null) return;

            String lang = detectLanguage(fb.getComment());
            if (lang != null) {
                fb.setSourceLang(lang);
                feedbackRepo.save(fb);
                log.info("[TRANSLATE] Detected lang='{}' for feedback {}", lang, feedbackId);
            }
        } catch (Exception e) {
            log.warn("[TRANSLATE] Lang detection failed for feedback {}: {}", feedbackId, e.getMessage());
        }
    }

    /**
     * Returns a (cached) translation of the feedback comment.
     * If sourceLang == targetLang → returns null (no translation needed).
     */
    @Transactional
    public FeedbackTranslationDto getTranslation(Long feedbackId, String targetLang) {
        Feedback fb = feedbackRepo.findById(feedbackId)
                .filter(f -> !f.isDeleted())
                .orElseThrow(() -> new java.util.NoSuchElementException("Feedback " + feedbackId + " not found"));

        String storedLang = fb.getSourceLang();

        String normalizedTarget = targetLang.toLowerCase().split("[-_]")[0]; // "en-US" → "en"

        // Only skip translation when source language is known and matches target
        if (storedLang != null && storedLang.equalsIgnoreCase(normalizedTarget)) {
            return FeedbackTranslationDto.builder()
                    .feedbackId(feedbackId)
                    .sourceLang(storedLang)
                    .targetLang(normalizedTarget)
                    .translatedComment(fb.getComment())
                    .cached(true)
                    .build();
        }

        // When source is unknown, assume English for the translation API call
        String sourceLang = storedLang != null ? storedLang : "en";

        // Check DB cache — skip if cached value equals original (bad cache from old fail-open)
        var cached = translationRepo.findByFeedbackIdAndTargetLang(feedbackId, normalizedTarget);
        FeedbackTranslation staleEntry = null;
        if (cached.isPresent()) {
            String cachedText = cached.get().getTranslatedComment();
            if (!cachedText.equals(fb.getComment())) {
                log.info("[TRANSLATE] Cache hit for feedback {} → {}", feedbackId, normalizedTarget);
                return FeedbackTranslationDto.builder()
                        .feedbackId(feedbackId)
                        .sourceLang(sourceLang)
                        .targetLang(normalizedTarget)
                        .translatedComment(cachedText)
                        .cached(true)
                        .build();
            }
            // Bad cache entry (same as original) — keep reference, will update in-place after re-translation
            log.warn("[TRANSLATE] Stale cache for feedback {} → {} (same as original), will update in-place...", feedbackId, normalizedTarget);
            staleEntry = cached.get();
        }

        // Translate
        String translated = translateText(fb.getComment(), sourceLang, normalizedTarget);

        if (translated == null) {
            throw new RuntimeException("Translation failed for lang=" + normalizedTarget
                    + " — model unavailable or API error");
        }

        // Cache in DB only if different from original (avoids caching failed translations)
        if (!translated.equals(fb.getComment())) {
            if (staleEntry != null) {
                // Update in-place to avoid duplicate key on concurrent requests
                staleEntry.setTranslatedComment(translated);
                translationRepo.save(staleEntry);
            } else {
                try {
                    FeedbackTranslation entity = FeedbackTranslation.builder()
                            .feedbackId(feedbackId)
                            .targetLang(normalizedTarget)
                            .translatedComment(translated)
                            .build();
                    translationRepo.save(entity);
                } catch (org.springframework.dao.DataIntegrityViolationException e) {
                    // Concurrent request saved first — translation still valid, just skip caching
                    log.warn("[TRANSLATE] Concurrent cache write for feedback {} → {}, ignoring duplicate", feedbackId, normalizedTarget);
                }
            }
        }

        return FeedbackTranslationDto.builder()
                .feedbackId(feedbackId)
                .sourceLang(sourceLang)
                .targetLang(normalizedTarget)
                .translatedComment(translated)
                .cached(false)
                .build();
    }

    // ── Language detection ─────────────────────────────────────────────────────

    public String detectLanguage(String text) {
        try {
            // Use at most 500 chars for detection (faster + cheaper)
            String sample = text.length() > 500 ? text.substring(0, 500) : text;

            RestTemplate rt = buildRestTemplate();
            HttpHeaders  hh = buildHeaders();
            String body = objectMapper.writeValueAsString(Map.of("inputs", sample));

            ResponseEntity<String> resp = rt.exchange(
                    HF_DETECT, HttpMethod.POST,
                    new HttpEntity<>(body, hh), String.class);

            JsonNode root = objectMapper.readTree(resp.getBody());
            // Response: [[{label:"fr", score:0.99}, ...]] or [{label:"fr", score:0.99}, ...]
            JsonNode arr = root.isArray() && root.get(0).isArray() ? root.get(0) : root;

            // Top label is the detected language
            String label = arr.get(0).path("label").asText(null);
            if (label != null) return label.toLowerCase();

        } catch (Exception e) {
            log.warn("[TRANSLATE] Language detection API failed: {}", e.getMessage());
        }
        return null;
    }

    // ── Translation ────────────────────────────────────────────────────────────

    /**
     * Translates text using the MyMemory free API (no key required).
     * MyMemory supports 100+ languages via ISO 639-1 codes and is highly reliable.
     * Free tier limit: 500 chars/request — longer texts are chunked automatically.
     */
    String translateText(String text, String src, String tgt) {
        if (src.equalsIgnoreCase(tgt)) return text;

        String srcCode = MYMEMORY_CODES.getOrDefault(src, src);
        String tgtCode = MYMEMORY_CODES.getOrDefault(tgt, tgt);
        String langPair = srcCode + "|" + tgtCode;

        try {
            RestTemplate rt = buildRestTemplate();

            // MyMemory free tier: max 500 chars per request — chunk if needed
            if (text.length() <= 500) {
                return callMyMemory(rt, text, langPair, src, tgt);
            }

            // Chunk on sentence boundaries (~500 chars each)
            StringBuilder result = new StringBuilder();
            int start = 0;
            while (start < text.length()) {
                int end = Math.min(start + 500, text.length());
                // Try to break at a sentence boundary
                if (end < text.length()) {
                    int dot = text.lastIndexOf('.', end);
                    int nl  = text.lastIndexOf('\n', end);
                    int boundary = Math.max(dot, nl);
                    if (boundary > start + 100) end = boundary + 1;
                }
                String chunk = text.substring(start, end).trim();
                String translated = callMyMemory(rt, chunk, langPair, src, tgt);
                if (translated == null) return null;
                if (result.length() > 0) result.append(' ');
                result.append(translated);
                start = end;
            }
            return result.toString();

        } catch (Exception e) {
            log.warn("[TRANSLATE] MyMemory call {}->{} failed: {}", src, tgt, e.getMessage());
        }
        return null;
    }

    private String callMyMemory(RestTemplate rt, String text, String langPair, String src, String tgt) {
        try {
            String url = UriComponentsBuilder.fromHttpUrl(MYMEMORY_URL)
                    .queryParam("q", text)
                    .queryParam("langpair", langPair)
                    .build(false)   // do NOT encode again (UriComponentsBuilder already encodes)
                    .toUriString();

            ResponseEntity<String> resp = rt.exchange(url, HttpMethod.GET,
                    new HttpEntity<>(new HttpHeaders()), String.class);

            JsonNode root = objectMapper.readTree(resp.getBody());
            int status = root.path("responseStatus").asInt(0);

            if (status == 200) {
                String translated = root.path("responseData").path("translatedText").asText(null);
                if (translated != null && !translated.isBlank()) {
                    log.info("[TRANSLATE] MyMemory {} → {} OK ({} chars)", src, tgt, translated.length());
                    return translated;
                }
            }

            log.warn("[TRANSLATE] MyMemory {}->{} unexpected response (status={}): {}",
                    src, tgt, status, resp.getBody());
        } catch (Exception e) {
            log.warn("[TRANSLATE] MyMemory chunk {}->{} failed: {}", src, tgt, e.getMessage());
        }
        return null;
    }

    // ── HTTP helpers ──────────────────────────────────────────────────────────

    private RestTemplate buildRestTemplate() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(10_000);
        factory.setReadTimeout(30_000);  // MyMemory is fast — 30s is plenty
        return new RestTemplate(factory);
    }

    private HttpHeaders buildHeaders() {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setAccept(List.of(MediaType.APPLICATION_JSON));
        if (hfApiKey != null && !hfApiKey.isBlank()) {
            headers.setBearerAuth(hfApiKey);
        }
        return headers;
    }
}
