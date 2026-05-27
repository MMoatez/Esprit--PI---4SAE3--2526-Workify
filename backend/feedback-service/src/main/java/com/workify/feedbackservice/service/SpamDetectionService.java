package com.workify.feedbackservice.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.workify.feedbackservice.exception.SpamDetectedException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

/**
 * Synchronous spam/abuse validation for feedback and response content.
 *
 * Strategy:
 *   1. Local pattern checks (fast, no network) → BLOCK on clear gibberish
 *   2. HuggingFace zero-shot classification    → BLOCK on offensive, FLAG on suspicious
 *   Fail-open: if HuggingFace is unavailable, content is allowed through (don't punish users
 *   for network issues).
 */
@Service
@Slf4j
public class SpamDetectionService {

    @Value("${huggingface.api.key:}")
    private String hfApiKey;

    private static final String HF_ZEROSHOT =
            "https://router.huggingface.co/hf-inference/models/facebook/bart-large-mnli/pipeline/zero-shot-classification";

    private static final List<String> SPAM_LABELS = List.of(
            "spam or gibberish text",
            "offensive or toxic content",
            "genuine feedback"
    );

    // Repeated character pattern: same char 5+ times in a row (aaaaaaa, @@@@@, 11111)
    private static final Pattern REPEATED_CHARS = Pattern.compile("(.)\\1{4,}");

    // Offensive keyword pattern — matched as whole words, case-insensitive
    private static final Pattern OFFENSIVE_KEYWORDS = Pattern.compile(
            "\\b(idiot|idiots|moron|morons|stupid|dumb|asshole|assholes|ass hole|" +
            "bastard|bastards|bitch|bitches|shit|shitty|crap|crappy|" +
            "go to hell|wtf|fuck|fucking|fucker|fucked|piss off|" +
            "trash|garbage|worthless|useless|loser|losers|scammer|" +
            "piece of (crap|shit)|you suck|you are (an idiot|a moron|a loser)|" +
            "hate you|kill yourself|kys)\\b",
            Pattern.CASE_INSENSITIVE
    );

    private final ObjectMapper objectMapper = new ObjectMapper();

    // ── Public API ─────────────────────────────────────────────────────────────

    /**
     * Validates text content for spam/abuse.
     * Throws {@link SpamDetectedException} if the content should be blocked.
     * Returns a fraud-flag string (or null) if it should be flagged but allowed.
     */
    public String validate(String text) {
        if (text == null || text.isBlank()) return null;

        String trimmed = text.trim();

        // 1. Local pattern checks — instant, no network
        SpamResult local = runLocalChecks(trimmed);
        if (local.action == Action.BLOCK) {
            log.info("[SPAM] BLOCK (local) reason={}", local.reason);
            throw new SpamDetectedException(
                    "Your comment was rejected: " + local.userMessage,
                    local.reason
            );
        }

        // 2. HuggingFace zero-shot — may fail (fail-open)
        SpamResult ai = runAiCheck(trimmed);
        if (ai.action == Action.BLOCK) {
            log.info("[SPAM] BLOCK (AI) reason={}", ai.reason);
            throw new SpamDetectedException(
                    "Your comment was rejected: " + ai.userMessage,
                    ai.reason
            );
        }

        // Combine local FLAG with AI FLAG
        if (local.action == Action.FLAG) return local.reason;
        if (ai.action   == Action.FLAG) return ai.reason;

        return null; // PASS
    }

    // ── Local pattern checks ───────────────────────────────────────────────────

    private SpamResult runLocalChecks(String text) {

        // 1. Repeated characters (aaaaaaa, @@@@@, 11111)
        if (REPEATED_CHARS.matcher(text).find()) {
            return SpamResult.block(
                    "repeated_chars",
                    "it contains excessively repeated characters."
            );
        }

        // 2. Offensive keywords — instant local detection, no network needed
        if (OFFENSIVE_KEYWORDS.matcher(text).find()) {
            return SpamResult.block(
                    "offensive_keywords",
                    "it contains offensive or inappropriate language."
            );
        }

        // 3. Vowel ratio — real words always have vowels; keyboard mash like "qwe asd zxc" has almost none
        long vowels = text.toLowerCase().chars()
                .filter(c -> "aeiou".indexOf(c) >= 0)
                .count();
        long totalLetters = text.chars().filter(Character::isLetter).count();
        if (totalLetters >= 8 && (double) vowels / totalLetters < 0.12) {
            return SpamResult.block(
                    "no_vowels",
                    "it does not appear to contain real words."
            );
        }

        // 5. Letter ratio — at least 40% of chars must be letters
        long letters = text.chars().filter(Character::isLetter).count();
        double letterRatio = (double) letters / text.length();
        if (letterRatio < 0.40) {
            return SpamResult.block(
                    "low_letter_ratio",
                    "it contains too many special characters or digits without real content."
            );
        }

        // 6. Word diversity — avoid "good good good good good"
        String[] words = text.toLowerCase().split("\\s+");
        if (words.length >= 6) {
            long unique = java.util.Arrays.stream(words).distinct().count();
            double diversity = (double) unique / words.length;
            if (diversity < 0.25) {
                return SpamResult.flag("low_word_diversity");
            }
        }

        // 7. Very short words only — keyboard mash like "asd qwe zxc"
        long meaningfulWords = java.util.Arrays.stream(words)
                .filter(w -> w.length() >= 3)
                .count();
        if (words.length >= 4 && (double) meaningfulWords / words.length < 0.30) {
            return SpamResult.flag("mostly_short_words");
        }

        return SpamResult.pass();
    }

    // ── HuggingFace AI check ──────────────────────────────────────────────────

    private SpamResult runAiCheck(String text) {
        try {
            RestTemplate rt = buildRestTemplate();
            HttpHeaders  hh = buildHeaders();

            String body = objectMapper.writeValueAsString(Map.of(
                    "inputs", text,
                    "parameters", Map.of(
                            "candidate_labels", SPAM_LABELS,
                            "multi_label", false
                    )
            ));

            ResponseEntity<String> resp = rt.exchange(
                    HF_ZEROSHOT, HttpMethod.POST,
                    new HttpEntity<>(body, hh), String.class);

            return parseAiResponse(resp.getBody());

        } catch (Exception e) {
            // Fail-open: network/API issue → allow the content
            log.warn("[SPAM] HuggingFace unavailable, failing open: {}", e.getMessage());
            return SpamResult.pass();
        }
    }

    private SpamResult parseAiResponse(String responseBody) {
        try {
            JsonNode root = objectMapper.readTree(responseBody);

            // Unwrap: HuggingFace may return an array wrapping the object
            JsonNode node = root.isArray() ? root.get(0) : root;

            // New flat array format: [{label, score}, ...]
            if (node.isArray()) {
                JsonNode first = node.get(0);
                String topLabel = first.path("label").asText("");
                double topScore = first.path("score").asDouble(0);
                return interpretLabel(topLabel, topScore);
            }

            // Object format: {labels:[...], scores:[...]}
            JsonNode labelsNode = node.get("labels");
            JsonNode scoresNode = node.get("scores");
            if (labelsNode != null && scoresNode != null
                    && labelsNode.size() > 0) {
                String topLabel = labelsNode.get(0).asText("");
                double topScore = scoresNode.get(0).asDouble(0);
                return interpretLabel(topLabel, topScore);
            }

        } catch (Exception e) {
            log.warn("[SPAM] Failed to parse AI response: {}", e.getMessage());
        }
        return SpamResult.pass();
    }

    private SpamResult interpretLabel(String label, double score) {
        log.info("[SPAM] AI top label='{}' score={}", label, score);

        if (label.contains("offensive") || label.contains("toxic")) {
            if (score >= 0.55) {
                return SpamResult.block(
                        "offensive_content",
                        "it contains offensive or inappropriate content."
                );
            }
            if (score >= 0.40) {
                return SpamResult.flag("possibly_offensive");
            }
        }

        if (label.contains("spam") || label.contains("gibberish")) {
            if (score >= 0.70) {
                return SpamResult.block(
                        "spam_or_gibberish",
                        "it appears to be meaningless content or spam."
                );
            }
            if (score >= 0.50) {
                return SpamResult.flag("possibly_spam");
            }
        }

        return SpamResult.pass();
    }

    // ── HTTP helpers ──────────────────────────────────────────────────────────

    private RestTemplate buildRestTemplate() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(8_000);
        factory.setReadTimeout(30_000);
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

    // ── Internal result type ──────────────────────────────────────────────────

    private enum Action { PASS, FLAG, BLOCK }

    private static class SpamResult {
        final Action action;
        final String reason;
        final String userMessage;

        SpamResult(Action action, String reason, String userMessage) {
            this.action      = action;
            this.reason      = reason;
            this.userMessage = userMessage;
        }

        static SpamResult pass()                              { return new SpamResult(Action.PASS,  null,   null); }
        static SpamResult flag(String reason)                 { return new SpamResult(Action.FLAG,  reason, null); }
        static SpamResult block(String reason, String msg)   { return new SpamResult(Action.BLOCK, reason, msg);  }
    }
}
