package com.workify.feedbackservice.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.workify.feedbackservice.domains.Feedback;
import com.workify.feedbackservice.domains.ResponseFeedback;
import com.workify.feedbackservice.repositories.FeedbackRepository;
import com.workify.feedbackservice.repositories.ResponseFeedbackRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.http.*;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

/**
 * Asynchronous AI analysis of feedback comments using HuggingFace Inference API.
 * Detects: sentiment (POSITIVE/NEUTRAL/NEGATIVE), tone, and key themes.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class FeedbackAIService {

    @Value("${huggingface.api.key:}")
    private String hfApiKey;

    private final FeedbackRepository         feedbackRepo;
    private final ResponseFeedbackRepository responseRepo;
    private final SimpMessagingTemplate      messaging;

    private final ObjectMapper objectMapper = new ObjectMapper();

    private static final String HF_BASE_SENTIMENT  =
            "https://router.huggingface.co/hf-inference/models/distilbert/distilbert-base-uncased-finetuned-sst-2-english/pipeline/text-classification";
    private static final String HF_BASE_ZEROSHOT  =
            "https://router.huggingface.co/hf-inference/models/facebook/bart-large-mnli/pipeline/zero-shot-classification";

    private static final List<String> TONE_LABELS = List.of(
            "enthusiastic", "formal", "casual", "frustrated", "disappointed"
    );
    private static final List<String> THEME_LABELS = List.of(
            "communication", "work quality", "deadline", "professionalism", "creativity", "pricing"
    );

    // ── Synchronous analysis — call before saving a Feedback ─────────────────

    /**
     * Computes AI fields (sentiment, tone, themes) from ratings and stores them
     * on the entity. All logic is rule-based so this is effectively instant.
     * Call this before {@code feedbackRepo.save()} so the stored record is
     * immediately complete — no async race, no "AI is analyzing…" on reload.
     */
    public void computeAIFields(Feedback fb) {
        int global = computedGlobal(fb);
        String sentiment;
        if (global >= 4)      sentiment = "POSITIVE";
        else if (global >= 3) sentiment = "NEUTRAL";
        else                  sentiment = "NEGATIVE";
        fb.setAiSentiment(sentiment);
        fb.setAiSentimentScore(global / 5.0f);
        fb.setAiTone(global >= 4 ? "enthusiastic" : global == 3 ? "formal" : "disappointed");
        fb.setAiThemes(extractThemesByRating(fb));
    }

    // ── Async entry point — only used by the startup batch scan ──────────────

    /**
     * Re-analyzes a single feedback asynchronously.
     * Only called from {@link #analyzeAllPending()} for feedbacks that were
     * saved before the synchronous analysis path was introduced (i.e., those
     * whose ai_sentiment column is still NULL in the database).
     * All feedbacks created or updated via the normal path already have
     * AI fields set synchronously — this method is NOT triggered for them.
     */
    @Async
    @Transactional
    public void analyzeAsync(Long feedbackId) {
        try {
            Feedback fb = feedbackRepo.findById(feedbackId).orElse(null);
            if (fb == null || fb.getAiSentiment() != null) return; // already cached

            computeAIFields(fb);
            feedbackRepo.save(fb);
            log.info("[AI] batch feedback={} sentiment={} tone={} themes={}",
                    feedbackId, fb.getAiSentiment(), fb.getAiTone(), fb.getAiThemes());

            // Notify any still-open client that was waiting for the result
            messaging.convertAndSend(
                "/topic/feedback-" + feedbackId + "-ai-ready",
                Map.of(
                    "feedbackId",        feedbackId,
                    "aiSentiment",       fb.getAiSentiment(),
                    "aiSentimentScore",  fb.getAiSentimentScore(),
                    "aiTone",            fb.getAiTone(),
                    "aiThemes",          fb.getAiThemes()
                )
            );
        } catch (Exception e) {
            log.warn("[AI] Batch analysis skipped for feedback {}: {}", feedbackId, e.getMessage());
        }
    }

    private static int computedGlobal(Feedback fb) {
        return (int) Math.round(
                (fb.getRatingCommunication() + fb.getRatingQuality()
                + fb.getRatingDeadline() + fb.getRatingProfessionalism()) / 4.0);
    }

    private String buildRichText(Feedback fb) {
        int global = computedGlobal(fb);
        String ratingWord = global >= 4 ? "excellent" : global == 3 ? "average" : "poor";
        return String.format(
                "The freelancer did %s work. Overall rating: %d/5. " +
                "Communication: %d/5. Quality: %d/5. Deadlines: %d/5. Professionalism: %d/5. " +
                "Client comment: %s",
                ratingWord, global,
                fb.getRatingCommunication(), fb.getRatingQuality(),
                fb.getRatingDeadline(), fb.getRatingProfessionalism(),
                fb.getComment() != null ? fb.getComment() : ""
        );
    }

    // ── Batch retroactive analysis ────────────────────────────────────────────

    @EventListener(ApplicationReadyEvent.class)
    @Async
    public void analyzeAllPending() {
        List<Feedback> all = feedbackRepo.findByDeletedFalseAndAiSentimentIsNull();
        log.info("[AI] Batch analysis starting for {} unanalyzed feedbacks", all.size());
        for (Feedback fb : all) {
            analyzeAsync(fb.getId());
        }

        // Fix feedbacks that have sentiment but are missing tone/themes (legacy data)
        List<Feedback> missingTone = feedbackRepo.findByDeletedFalseAndAiToneIsNull();
        log.info("[AI] Fixing tone/themes for {} legacy feedbacks", missingTone.size());
        for (Feedback fb : missingTone) {
            computeAIFields(fb); // fills all fields from ratings (idempotent)
            feedbackRepo.save(fb);
        }

        // Re-classify ALL existing responses — corrects rows stored under old hardcoded POSITIVE logic
        List<com.workify.feedbackservice.domains.ResponseFeedback> responses =
                responseRepo.findByDeletedFalse();
        log.info("[AI] Re-classifying {} existing responses with updated classifier", responses.size());
        for (com.workify.feedbackservice.domains.ResponseFeedback resp : responses) {
            computeResponseAIFields(resp);
            responseRepo.save(resp);
        }
    }

    // ── Response AI analysis ──────────────────────────────────────────────────

    /**
     * Classifies a freelancer reply synchronously using keyword-based analysis.
     * Detects: APOLOGETIC, CONSTRUCTIVE, POSITIVE, NEGATIVE, NEUTRAL.
     * Call this before {@code responseRepo.save()} so the stored record is immediately
     * complete — no async race, no "analyzing…" shown to the user on reload.
     */
    public void computeResponseAIFields(ResponseFeedback resp) {
        String text = resp.getContent() == null ? "" : resp.getContent().toLowerCase();

        // ── Keyword banks ─────────────────────────────────────────────────
        boolean isApologetic = containsAny(text,
                "sorry", "apologize", "apologies", "i apologize", "i'm sorry",
                "regret", "my fault", "i failed", "i missed", "i sincerely",
                "i take responsibility", "i acknowledge", "pardon", "forgive");

        boolean isConstructive = containsAny(text,
                "will improve", "will do better", "i will", "commit", "ensure",
                "guarantee", "next time", "learn from", "take this seriously",
                "work harder", "moving forward", "going forward", "i promise",
                "make it right", "i am committed", "dedicated", "steps to",
                "do better", "improve", "will make", "make changes",
                "take action", "address this", "work on", "seriously to");

        boolean isPositive = !isApologetic && containsAny(text,
                "thank you", "grateful", "appreciate", "great experience",
                "happy to", "excited", "proud", "delighted", "pleasure");

        boolean isDefensive = containsAny(text,
                "i disagree", "not accurate", "misunderstanding", "unfair",
                "incorrect", "i believe you are wrong", "but i think");

        // ── Sentiment + tone (priority order) ────────────────────────────
        String sentiment;
        float  score;
        String tone;

        if (isApologetic) {
            sentiment = "APOLOGETIC";   score = 0.30f;  tone = "apologetic";
        } else if (isConstructive) {
            sentiment = "CONSTRUCTIVE"; score = 0.65f;  tone = "constructive";
        } else if (isPositive) {
            sentiment = "POSITIVE";     score = 0.85f;  tone = "enthusiastic";
        } else if (isDefensive) {
            sentiment = "NEGATIVE";     score = 0.20f;  tone = "formal";
        } else {
            sentiment = "NEUTRAL";      score = 0.50f;  tone = "formal";
        }

        resp.setAiSentiment(sentiment);
        resp.setAiSentimentScore(score);
        resp.setAiTone(tone);
        resp.setAiThemes(extractResponseThemes(text));
    }

    /** Used only by the startup batch scan for legacy rows still missing AI fields. */
    @Async
    @Transactional
    public void analyzeResponseAsync(Long responseId) {
        try {
            ResponseFeedback resp = responseRepo.findById(responseId).orElse(null);
            if (resp == null) return;
            computeResponseAIFields(resp);
            responseRepo.save(resp);
            log.info("[AI] response={} sentiment={} tone={} themes={}",
                    responseId, resp.getAiSentiment(), resp.getAiTone(), resp.getAiThemes());
        } catch (Exception e) {
            log.warn("[AI] Response analysis skipped for {}: {}", responseId, e.getMessage());
        }
    }

    private String extractResponseThemes(String text) {
        StringBuilder sb = new StringBuilder();
        if (containsAny(text, "deadline", "late", "delay", "on time", "time"))
            append(sb, "Deadline");
        if (containsAny(text, "quality", "standard", "output", "result", "deliver", "work"))
            append(sb, "Work Quality");
        if (containsAny(text, "communicat", "contact", "respond", "update", "inform"))
            append(sb, "Communication");
        if (containsAny(text, "professional", "conduct", "behavior", "attitude", "manner"))
            append(sb, "Professionalism");
        return sb.length() > 0 ? sb.toString() : "Communication,Professionalism";
    }

    private static boolean containsAny(String text, String... keywords) {
        for (String kw : keywords) {
            if (text.contains(kw)) return true;
        }
        return false;
    }

    // ── Zero-shot classification ──────────────────────────────────────────────

    private JsonNode zeroShot(String text, List<String> labels, boolean multiLabel) {
        try {
            RestTemplate rt = buildRestTemplate();
            HttpHeaders  hh = buildHeaders();
            String body = objectMapper.writeValueAsString(Map.of(
                    "inputs", text,
                    "parameters", Map.of(
                            "candidate_labels", labels,
                            "multi_label", multiLabel
                    )
            ));
            ResponseEntity<String> resp = rt.exchange(
                    HF_BASE_ZEROSHOT, HttpMethod.POST,
                    new HttpEntity<>(body, hh), String.class);
            String responseBody = resp.getBody();
            log.info("[AI] Zero-shot raw response: {}", responseBody);
            return objectMapper.readTree(responseBody);
        } catch (Exception e) {
            log.warn("[AI] Zero-shot failed: {}", e.getMessage());
            return null;
        }
    }

    /**
     * Extracts the top label. Handles two formats from HuggingFace router:
     *   New flat array:  [{label, score}, {label, score}, ...]  (already sorted desc)
     *   Old object:      {labels:[...], scores:[...]}  or  [{labels:[...]}]
     */
    private String topLabel(JsonNode root) {
        if (root == null) return null;
        // New flat array: [{label, score}, ...]
        if (root.isArray() && root.size() > 0) {
            JsonNode first = root.get(0);
            if (first.has("label")) return first.path("label").asText(null);
            // Wrapped old format: [{labels:[...], scores:[...]}]
            if (first.has("labels")) {
                JsonNode ln = first.get("labels");
                return (ln.isArray() && ln.size() > 0) ? ln.get(0).asText() : null;
            }
        }
        // Old object: {labels:[...], scores:[...]}
        JsonNode labelsNode = root.get("labels");
        if (labelsNode != null && labelsNode.isArray() && labelsNode.size() > 0) {
            return labelsNode.get(0).asText();
        }
        return null;
    }

    private String extractThemes(String text) {
        JsonNode root = zeroShot(text, THEME_LABELS, true);
        if (root == null) return null;

        StringBuilder sb = new StringBuilder();

        // New flat array: [{label, score}, ...]
        if (root.isArray() && root.size() > 0 && root.get(0).has("label")) {
            for (JsonNode item : root) {
                if (item.path("score").asDouble() >= 0.20) {
                    if (sb.length() > 0) sb.append(",");
                    sb.append(item.path("label").asText());
                }
            }
            return sb.length() > 0 ? sb.toString() : null;
        }

        // Old object or wrapped: unwrap if needed
        JsonNode node = (root.isArray() && root.size() > 0) ? root.get(0) : root;
        JsonNode labelsNode = node.get("labels");
        JsonNode scoresNode = node.get("scores");
        if (labelsNode == null || scoresNode == null) return null;

        for (int i = 0; i < Math.min(labelsNode.size(), THEME_LABELS.size()); i++) {
            if (scoresNode.get(i).asDouble() >= 0.20) {
                if (sb.length() > 0) sb.append(",");
                sb.append(labelsNode.get(i).asText());
            }
        }
        return sb.length() > 0 ? sb.toString() : null;
    }

    // ── Rule-based themes from sub-ratings ───────────────────────────────────

    private String extractThemesByRating(Feedback fb) {
        StringBuilder sb = new StringBuilder();
        if (fb.getRatingCommunication()   <= 2) append(sb, "Communication");
        if (fb.getRatingQuality()         <= 2) append(sb, "Work Quality");
        if (fb.getRatingDeadline()        <= 2) append(sb, "Deadline");
        if (fb.getRatingProfessionalism() <= 2) append(sb, "Professionalism");
        if (sb.length() == 0) {
            if (fb.getRatingCommunication()   >= 4) append(sb, "Communication");
            if (fb.getRatingQuality()         >= 4) append(sb, "Work Quality");
            if (fb.getRatingDeadline()        >= 4) append(sb, "Deadline");
            if (fb.getRatingProfessionalism() >= 4) append(sb, "Professionalism");
        }
        return sb.length() > 0 ? sb.toString() : "Work Quality";
    }

    private static void append(StringBuilder sb, String value) {
        if (sb.length() > 0) sb.append(",");
        sb.append(value);
    }

    // ── HTTP helpers ──────────────────────────────────────────────────────────

    private RestTemplate buildRestTemplate() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(10_000);
        factory.setReadTimeout(60_000);
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
