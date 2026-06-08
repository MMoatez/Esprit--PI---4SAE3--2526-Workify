package com.workify.communication.service;

import org.springframework.stereotype.Service;

import java.text.Normalizer;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * Analyses message text for inappropriate content using a multi-stage pipeline:
 *  1. Symbol spam detection  (e.g. "&&&&", "%ùù!!$$!ù", "*******$*$ùùùAAA")
 *     - Same character repeated 4+ times → caught regardless of type (e.g. "AAAA", "µµµµ")
 *     - More than 50 % non-alphanumeric chars → caught (e.g. mixed symbol/letter noise)
 *  2. Profanity detection     (direct, leet-speak, spaced, disguised)
 *  3. Excessive-caps detection (e.g. "AZERFQDF SHOUTING", 5+ alpha chars, >75 % uppercase)
 */
@Service
public class ContentModerationService {

    // ── Word list ─────────────────────────────────────────────────────────────
    // English + French offensive/profane words (normalized forms after pipeline)
    private static final Set<String> BANNED_WORDS = Set.of(
        // English
        "fuck", "fuuck", "shit", "bitch", "ass", "asshole", "bastard", "cunt",
        "dick", "prick", "pussy", "cock", "whore", "slut", "damn", "crap",
        "faggot", "fag", "nigger", "nigga", "retard", "idiot", "moron",
        "imbecile", "loser", "wanker", "twat", "bollocks", "piss", "pissoff",
        "dumbass", "jackass", "motherfucker", "motherfuck", "bastards",
        "bullshit", "horseshit", "dipshit", "numbnuts", "nutjob",
        // French
        "merde", "putain", "connard", "connasse", "con", "salope", "enculer",
        "encule", "fdp", "ntm", "nique", "pute", "bordel", "chier", "batard",
        "batar", "conne", "abruti", "tg", "tafoutre", "va te faire",
        "ferme ta gueule", "mange merde", "fils de pute", "va te faire foutre",
        "fils depute", "couille", "couillon", "branleur", "branler", "ta gueule",
        "pede", "tapette", "zamel", "wesh", "bouffon", "pd", "espece de merde"
    );

    // Compiled pattern for removing non-alpha chars between letter clusters
    // Matches one or more non-letter chars surrounded by word chars
    private static final Pattern INTER_LETTER_NOISE = Pattern.compile("(?<=[a-z])([^a-z]+)(?=[a-z])");

    // Three or more consecutive identical characters → collapse to two
    private static final Pattern REPEATED_CHARS = Pattern.compile("(.)\\1{2,}");

    // ── Public API ────────────────────────────────────────────────────────────

    public record ModerationResult(boolean violation, String reason) {}

    /**
     * Analyse {@code text} and return a {@link ModerationResult}.
     * Applies only to TEXT messages; call site must skip other content types.
     */
    public ModerationResult analyze(String text) {
        if (text == null || text.isBlank()) {
            return new ModerationResult(false, null);
        }

        // 1. Symbol spam
        if (isSymbolSpam(text)) {
            return new ModerationResult(true, "SYMBOL_SPAM");
        }

        // 2. Profanity (normalized)
        String normalized = normalize(text);
        if (containsProfanity(normalized)) {
            return new ModerationResult(true, "PROFANITY");
        }

        // 3. Excessive caps (shouting)
        if (isExcessiveCaps(text)) {
            return new ModerationResult(true, "EXCESSIVE_CAPS");
        }

        return new ModerationResult(false, null);
    }

    // ── Detection steps ───────────────────────────────────────────────────────

    /**
     * True when more than 50 % of characters are non-alphanumeric and
     * the text is longer than 3 characters.
     * Catches: "&&&&", "%ùù!!$$!ù", "*******$*$ùùùAAA" (62 %), "*****$ùù$ùùùù!ù!" (56 %).
     * Threshold lowered from 70 % to 50 % to catch mixed symbol/letter noise.
     */
    private boolean isSymbolSpam(String text) {
        if (text.length() <= 3) return false;
        // Also flag repetitive gibberish: same character repeated 4+ times (catches "AAAA", "µµµµ", "****").
        if (text.length() >= 4 && isAllSameChar(text)) return true;
        long nonAlpha = text.chars()
                .filter(c -> !Character.isLetterOrDigit(c) && !Character.isWhitespace(c))
                .count();
        return (double) nonAlpha / text.length() > 0.50;
    }

    /** Returns true when every character in {@code text} is identical. */
    private boolean isAllSameChar(String text) {
        int first = text.charAt(0);
        for (int i = 1; i < text.length(); i++) {
            if (text.charAt(i) != first) return false;
        }
        return true;
    }

    /**
     * True when more than 75 % of alphabetic characters in the message are
     * uppercase AND the text contains at least 5 alphabetic characters.
     * Catches: "AZERFQDF", "YOU IDIOT STOP", all-caps abuse.
     * (Short all-caps gibberish like "AAAA" is caught earlier by isAllSameChar.)
     */
    private boolean isExcessiveCaps(String text) {
        long upper = text.chars().filter(Character::isUpperCase).count();
        long alpha = text.chars().filter(Character::isLetter).count();
        return alpha >= 5 && (double) upper / alpha > 0.75;
    }

    /**
     * Split normalized text into tokens separated by whitespace,
     * then check each token against BANNED_WORDS.
     *
     * Substring matching is intentionally restricted to banned words of length >= 5.
     * Short banned words like "con" (3) or "ass" (3) must match a whole token exactly —
     * otherwise they produce false positives inside legitimate words such as
     * "confirmed" (contains "con") or "class" (contains "ass").
     */
    private boolean containsProfanity(String normalized) {
        for (String token : normalized.split("\\s+")) {
            if (token.isEmpty()) continue;
            // 1. Exact whole-token match (catches all banned words regardless of length)
            if (BANNED_WORDS.contains(token)) return true;
            // 2. Substring check — only for banned words ≥ 5 chars to avoid false positives
            //    with short words appearing inside innocent vocabulary.
            for (String banned : BANNED_WORDS) {
                if (banned.length() >= 5 && token.contains(banned)) return true;
            }
        }
        return false;
    }

    // ── Normalization pipeline ────────────────────────────────────────────────

    /**
     * Normalizes text for profanity matching, processing each whitespace-separated
     * word independently so that word boundaries are preserved.
     *
     * Processing per word avoids collapsing "it is confirmed" into
     * "itisconfirmed" (which would contain "con", a banned word).
     * Intra-word obfuscation (e.g. "f.u.c.k", "c.0.n") is still caught
     * because INTER_LETTER_NOISE is applied within each individual token.
     *
     * Per-word pipeline:
     *  a) Unicode NFD → strip diacritics (é→e, ç→c, ü→u)
     *  b) Lowercase
     *  c) Leet-speak substitution
     *  d) Collapse 3+ consecutive identical chars to 2
     *  e) Remove intra-word non-alpha noise (f.u.c.k → fuck, c.0.n → con)
     */
    String normalize(String text) {
        String[] words = text.split("\\s+");
        StringBuilder result = new StringBuilder();
        for (int i = 0; i < words.length; i++) {
            if (i > 0) result.append(' ');
            String word = words[i];
            // a) Strip diacritics
            String nfd = Normalizer.normalize(word, Normalizer.Form.NFD);
            String stripped = nfd.replaceAll("\\p{InCombiningDiacriticalMarks}", "");
            // b) Lowercase
            String lower = stripped.toLowerCase();
            // c) Leet-speak
            String leet = applyLeet(lower);
            // d) Collapse repeated chars: "fuuuck" → "fuuck"
            String collapsed = REPEATED_CHARS.matcher(leet).replaceAll("$1$1");
            // e) Remove intra-word non-alpha noise: "f.u.c.k" → "fuck"
            String clean = INTER_LETTER_NOISE.matcher(collapsed).replaceAll("");
            result.append(clean);
        }
        return result.toString().trim();
    }

    private String applyLeet(String s) {
        StringBuilder sb = new StringBuilder(s.length());
        for (char c : s.toCharArray()) {
            sb.append(switch (c) {
                case '@'       -> 'a';
                case '$', '5' -> 's';
                case '0'       -> 'o';
                case '3'       -> 'e';
                case '1', '!', '|' -> 'i';
                case '4'       -> 'a';
                case '7'       -> 't';
                default        -> c;
            });
        }
        return sb.toString();
    }
}
