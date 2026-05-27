package com.workify.feedbackservice.service;

import com.workify.feedbackservice.domains.Feedback;
import com.workify.feedbackservice.domains.ResponseFeedback;
import com.workify.feedbackservice.repositories.FeedbackRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

/**
 * Détection de fraude par règles métier (synchrone, sans IA externe).
 * Score entre 0.0 (fiable) et 1.0 (très suspect).
 * >= 0.7 = signalé pour modération admin.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class FraudDetectionService {

    private final FeedbackRepository feedbackRepository;

    public void analyzeFeedback(Feedback feedback) {
        float score = 0f;
        List<String> flags = new ArrayList<>();

        // Commentaire trop court
        if (feedback.getComment() != null && feedback.getComment().length() < 30) {
            score += 0.30f;
            flags.add("short_text");
        }

        // Note extrême (1 ou 5) avec commentaire court
        if ((feedback.getRatingGlobal() == 5 || feedback.getRatingGlobal() == 1)
                && feedback.getComment() != null && feedback.getComment().length() < 50) {
            score += 0.25f;
            flags.add("extreme_rating_short");
        }

        // Premier feedback de ce client
        if (feedbackRepository.countByClientEmail(feedback.getClientEmail()) == 0) {
            score += 0.10f;
            flags.add("new_reviewer");
        }

        // Commentaire identique à un existant (doublon)
        if (feedback.getComment() != null &&
                feedbackRepository.existsByCommentAndDeletedFalse(feedback.getComment())) {
            score += 0.60f;
            flags.add("duplicate_text");
        }

        // Note globale très différente de la moyenne des sous-notes
        double avgSubRatings = (feedback.getRatingCommunication()
                + feedback.getRatingQuality()
                + feedback.getRatingDeadline()
                + feedback.getRatingProfessionalism()) / 4.0;
        if (Math.abs(feedback.getRatingGlobal() - avgSubRatings) >= 2) {
            score += 0.20f;
            flags.add("inconsistent_ratings");
        }

        float finalScore = Math.min(score, 1.0f);
        feedback.setFraudScore(finalScore);
        feedback.setFraudFlags(flags.isEmpty() ? null : String.join(",", flags));

        if (finalScore >= 0.7f) {
            log.warn("[FRAUD] Feedback suspect (score={}) pour offre {} — flags: {}",
                    finalScore, feedback.getOfferId(), flags);
        }
    }

    public void analyzeResponse(ResponseFeedback response) {
        float score = 0f;
        List<String> flags = new ArrayList<>();

        if (response.getContent() != null && response.getContent().length() < 15) {
            score += 0.30f;
            flags.add("short_response");
        }

        float finalScore = Math.min(score, 1.0f);
        response.setFraudScore(finalScore);
        response.setFraudFlags(flags.isEmpty() ? null : String.join(",", flags));
    }
}
