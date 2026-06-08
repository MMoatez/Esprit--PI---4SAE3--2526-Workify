package com.workify.communication.service;

import com.workify.communication.domain.Message;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.regex.Pattern;

/**
 * Smart rule-based engine that analyses text messages and extracts important
 * discussion points as auto-notes.
 *
 * <p>Detection uses a weighted keyword scoring system across six categories:
 * PAYMENT, DEADLINE, AGREEMENT, MEETING, DELIVERY, MILESTONE.
 * A message is promoted to a note only when its score reaches the threshold
 * (≥ 3 points) to avoid noise from casual mentions of common words.
 *
 * <p>The engine is bilingual (English + French) to match the project's mixed
 * user base.
 */
@Slf4j
@Service
public class NoteExtractionService {

    // ── Scoring threshold ────────────────────────────────────────────────
    private static final int SCORE_THRESHOLD = 3;

    // ── Category definitions ─────────────────────────────────────────────

    /** High-confidence (3 pts) multi-word phrases per category. */
    private static final Map<String, List<String>> HIGH_PHRASES = Map.of(

        "PAYMENT", List.of(
            "budget of", "price is", "costs ", "invoice for", "pay you",
            "total is", "rate is", "fee is", "quote is", "payment of",
            "montant de", "tarif de", "devis de", "je te paie", "facture de",
            "le prix est", "on a convenu d", "prix convenu", "will cost",
            "agreed on the price", "agreed on the budget"
        ),

        "DEADLINE", List.of(
            "deadline is", "due date", "deliver by", "finish by",
            "send by", "submit by", "completed by", "ready by",
            "by monday", "by tuesday", "by wednesday", "by thursday",
            "by friday", "by saturday", "by sunday", "by tomorrow",
            "by end of day", "by eod", "by next week", "before the",
            "date limite", "à livrer", "livrer pour", "rendre pour",
            "délai de", "pour le", "avant le", "rendu le"
        ),

        "AGREEMENT", List.of(
            "we agreed", "we decided", "we confirmed", "it is confirmed",
            "deal confirmed", "officially confirmed", "we'll go with",
            "going with", "we finalized", "finalized on", "we chose",
            "on a décidé", "c'est confirmé", "c'est officiel",
            "on est d'accord sur", "on a choisi", "on a retenu",
            "affaire conclue", "marché conclu", "ok pour"
        ),

        "MEETING", List.of(
            "call at", "meeting at", "scheduled for", "zoom at", "teams at",
            "meet at", "appointment at", "sync at", "standup at",
            "let's meet", "let's call", "can we call", "set a call",
            "call me at", "call you at", "talk at", "speak at",
            "schedule a call", "schedule a meeting", "book a call",
            "rendez-vous à", "réunion à", "appel à", "on se retrouve à",
            "on se voit à", "je t'appelle à", "appel prévu",
            "appelle-moi à", "appelle moi à", "on s'appelle à"
        ),

        "DELIVERY", List.of(
            "i'll send you", "sending you", "sent you", "i've sent",
            "i uploaded", "just uploaded", "here is the", "here's the",
            "i've attached", "file attached", "document attached",
            "deliver before", "delivered before", "i can deliver",
            "je t'envoie", "je vais t'envoyer", "voici le fichier",
            "j'ai envoyé", "j'ai uploadé", "je l'ai envoyé",
            "c'est envoyé", "voilà le document", "je livre avant", "livré avant"
        ),

        "MILESTONE", List.of(
            "completed the", "finished the", "done with", "phase completed",
            "ready for review", "ready for feedback", "v1 is ready",
            "first draft", "just launched", "it's live", "deployed",
            "j'ai terminé", "c'est terminé", "phase terminée",
            "prêt pour la review", "prêt pour validation",
            "première version", "c'est en ligne", "c'est déployé"
        )
    );

    /** Medium-confidence (1 pt) single keywords per category. */
    private static final Map<String, List<String>> MEDIUM_KEYWORDS = Map.of(

        "PAYMENT", List.of(
            "budget", "price", "cost", "pay", "invoice", "payment",
            "quote", "rate", "fee", "salary", "wage", "amount",
            "prix", "montant", "paiement", "facture", "devis", "tarif",
            "salaire", "rémunération"
        ),

        "DEADLINE", List.of(
            "deadline", "deliver", "finish", "submit", "due",
            "délai", "livraison", "livrer", "terminer", "rendre"
        ),

        "AGREEMENT", List.of(
            "agreed", "confirmed", "deal", "decided", "accept",
            "approved", "green light", "convenu", "d'accord",
            "accepté", "approuvé", "validé"
        ),

        "MEETING", List.of(
            "meeting", "call", "schedule", "zoom", "teams",
            "appointment", "sync", "réunion", "appel", "rendez-vous"
        ),

        "DELIVERY", List.of(
            "sending", "uploaded", "attached", "delivered",
            "envoyé", "uploadé", "joint", "livré"
        ),

        "MILESTONE", List.of(
            "completed", "finished", "done", "ready", "launched",
            "deployed", "live", "terminé", "prêt", "livré", "déployé"
        )
    );

    /** Regex for monetary amounts (e.g. 500€, $200, 1000 DA). */
    private static final Pattern MONEY_PATTERN = Pattern.compile(
        "\\d+\\s*[€$£]|[€$£]\\s*\\d+|\\d+\\s*(eur|usd|gbp|da|dzd|dinar|euro?s?|dollar?s?)",
        Pattern.CASE_INSENSITIVE);

    /** Regex for explicit date references (e.g. March 15, 15/03, tomorrow, next week). */
    private static final Pattern DATE_PATTERN = Pattern.compile(
        "\\b(tomorrow|today|yesterday|monday|tuesday|wednesday|thursday|friday|saturday|sunday" +
        "|next week|end of week|end of month" +
        "|demain|aujourd'hui|hier|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche" +
        "|semaine prochaine|fin de semaine|fin du mois" +
        "|\\d{1,2}[/-]\\d{1,2}([/-]\\d{2,4})?" +
        "|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec" +
        "|janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\\b",
        Pattern.CASE_INSENSITIVE);

    /** Regex for time references (e.g. at 3pm, at 14:00). */
    private static final Pattern TIME_PATTERN = Pattern.compile(
        "\\bat\\s+\\d{1,2}(:\\d{2})?(\\s*(am|pm))?|\\d{1,2}h\\d{0,2}|\\d{2}:\\d{2}",
        Pattern.CASE_INSENSITIVE);

    // ── Category display ──────────────────────────────────────────────────

    private static final Map<String, String> EMOJI = Map.of(
        "PAYMENT",   "💰",
        "DEADLINE",  "📅",
        "AGREEMENT", "✅",
        "MEETING",   "📞",
        "DELIVERY",  "📦",
        "MILESTONE", "🎯"
    );

    private static final Map<String, String> LABEL = Map.of(
        "PAYMENT",   "Payment discussed",
        "DEADLINE",  "Deadline mentioned",
        "AGREEMENT", "Agreement reached",
        "MEETING",   "Meeting / Call planned",
        "DELIVERY",  "Delivery / File shared",
        "MILESTONE", "Milestone completed"
    );

    // ── Public API ───────────────────────────────────────────────────────

    /**
     * Analyses a list of messages and returns extracted note entries.
     * Each entry holds the formatted note content and a category tag.
     */
    public List<ExtractedNote> extract(List<Message> messages) {
        List<ExtractedNote> results = new ArrayList<>();
        Set<String> seenSnippets = new HashSet<>();   // deduplicate similar content

        for (Message msg : messages) {
            String raw = msg.getContent();
            if (raw == null || raw.isBlank() || raw.trim().startsWith("{")) continue;
            if (raw.length() < 8) continue;  // too short to carry meaning

            String lower = raw.toLowerCase(Locale.ROOT);
            String best = bestCategory(lower, raw);
            if (best == null) continue;

            // Build the snippet (cap at 120 chars)
            String snippet = raw.trim().replaceAll("\\s+", " ");
            if (snippet.length() > 120) snippet = snippet.substring(0, 120) + "…";

            // Deduplicate by normalised snippet prefix
            String key = snippet.toLowerCase().substring(0, Math.min(40, snippet.length()));
            if (seenSnippets.contains(key)) continue;
            seenSnippets.add(key);

            String noteContent = EMOJI.get(best) + " " + LABEL.get(best) + ": \""  + snippet + "\"";
            results.add(new ExtractedNote(noteContent, best, msg.getCreatedAt()));

            log.debug("📝 Extracted [{}]: {}", best, snippet.substring(0, Math.min(60, snippet.length())));
        }

        log.info("🔍 NoteExtractor: {} messages → {} notes extracted", messages.size(), results.size());
        return results;
    }

    // ── Internal scoring ─────────────────────────────────────────────────

    private String bestCategory(String lower, String raw) {
        Map<String, Integer> scores = new HashMap<>();

        // High-confidence multi-word phrases (+3 each)
        for (Map.Entry<String, List<String>> e : HIGH_PHRASES.entrySet()) {
            for (String phrase : e.getValue()) {
                if (lower.contains(phrase)) {
                    scores.merge(e.getKey(), 3, Integer::sum);
                }
            }
        }

        // Medium-confidence single keywords (+1 each, max +2 per category to avoid keyword spam)
        for (Map.Entry<String, List<String>> e : MEDIUM_KEYWORDS.entrySet()) {
            int hits = 0;
            for (String kw : e.getValue()) {
                if (lower.contains(kw) && ++hits <= 2) {
                    scores.merge(e.getKey(), 1, Integer::sum);
                }
            }
        }

        // Bonus signals (apply to whichever category is already leading)
        if (MONEY_PATTERN.matcher(lower).find()) {
            scores.merge("PAYMENT", 3, Integer::sum);
        }
        if (DATE_PATTERN.matcher(lower).find()) {
            scores.merge("DEADLINE",  1, Integer::sum);
            scores.merge("MEETING",   1, Integer::sum);
            scores.merge("AGREEMENT", 1, Integer::sum);
        }
        if (TIME_PATTERN.matcher(lower).find()) {
            scores.merge("MEETING", 2, Integer::sum);
        }

        // Pick category with highest score above threshold
        return scores.entrySet().stream()
                .filter(e -> e.getValue() >= SCORE_THRESHOLD)
                .max(Map.Entry.comparingByValue())
                .map(Map.Entry::getKey)
                .orElse(null);
    }

    // ── DTO ──────────────────────────────────────────────────────────────

    public record ExtractedNote(
        String content,
        String sourceType,
        java.time.LocalDateTime timestamp
    ) {}
}
