package com.workify.feedbackservice.service;

import com.workify.feedbackservice.domains.*;
import com.workify.feedbackservice.dto.*;
import com.workify.feedbackservice.repositories.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.*;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

import com.workify.feedbackservice.exception.SpamDetectedException;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class FeedbackService {

    private final FeedbackRepository            feedbackRepo;
    private final EvaluationWindowRepository    windowRepo;
    private final ResponseFeedbackRepository    responseRepo;
    private final FraudDetectionService         fraudService;
    private final FeedbackAIService             aiService;
    private final SpamDetectionService          spamService;
    private final TranslationService            translationService;
    private final SimpMessagingTemplate         messaging;

    // ── CREATE ──────────────────────────────────────────────────────────────

    public FeedbackDto create(Long offerId, FeedbackRequest req) {

        // Vérification fenêtre d'évaluation
        EvaluationWindow window = windowRepo.findByOfferId(offerId)
                .orElseThrow(() -> new IllegalStateException(
                        "No evaluation window found for offer " + offerId));

        if (!window.isEvaluationPending()) {
            throw new IllegalStateException("The evaluation window is closed for offer " + offerId);
        }
        if (LocalDateTime.now().isAfter(window.getEvaluationDeadline())) {
            window.setEvaluationPending(false);
            windowRepo.save(window);
            throw new IllegalStateException("The evaluation deadline has expired for offer " + offerId);
        }
        if (!window.getClientEmail().equals(req.getClientEmail())) {
            throw new SecurityException("Only the project owner can leave feedback");
        }
        if (feedbackRepo.existsByOfferIdAndDeletedFalse(offerId)) {
            throw new IllegalStateException("A feedback already exists for this offer");
        }

        // Spam validation — client will choose: edit or submit for admin review
        String spamFlag = null;
        try {
            spamFlag = spamService.validate(req.getComment());
        } catch (SpamDetectedException e) {
            throw e; // re-throw → frontend shows choice: edit vs submit for review
        }

        Feedback feedback = Feedback.builder()
                .offerId(offerId)
                .clientEmail(req.getClientEmail())
                .freelancerId(window.getFreelancerId())
                .projectTitle(window.getProjectTitle())
                .ratingCommunication(req.getRatingCommunication())
                .ratingQuality(req.getRatingQuality())
                .ratingDeadline(req.getRatingDeadline())
                .ratingProfessionalism(req.getRatingProfessionalism())
                .ratingGlobal((int) Math.round((req.getRatingCommunication() + req.getRatingQuality()
                        + req.getRatingDeadline() + req.getRatingProfessionalism()) / 4.0))
                .comment(req.getComment())
                .recommend(req.getRecommend())
                .attachments(joinAttachments(req.getAttachments()))
                .build();

        // Append spam flag to fraud flags if present
        if (spamFlag != null) {
            feedback.setFraudFlags(spamFlag);
        }

        // Fraud detection
        fraudService.analyzeFeedback(feedback);

        // AI analysis — computed synchronously so the saved record (and returned DTO)
        // already contain ai_sentiment/tone/themes. No async race, no "analyzing…" on load.
        aiService.computeAIFields(feedback);

        feedback = feedbackRepo.save(feedback);

        // Language detection only — non-blocking, not shown to users immediately
        final Long feedbackId = feedback.getId();
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                translationService.detectAndStoreLangAsync(feedbackId);
            }
        });

        // Fermer la fenêtre d'évaluation
        window.setEvaluationPending(false);
        windowRepo.save(window);

        // Notifier le freelancer via WebSocket
        FeedbackNotification notif = FeedbackNotification.feedbackReceived(
                feedback.getId(), window.getProjectTitle());
        messaging.convertAndSend(
                "/topic/freelancer-" + window.getFreelancerId() + "-notifications", notif);

        log.info("[FEEDBACK] Created for offer {} by {}", offerId, req.getClientEmail());
        return toDto(feedback);
    }

    // ── READ ─────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public FeedbackDto getByOfferId(Long offerId) {
        Feedback fb = feedbackRepo.findByOfferIdAndDeletedFalse(offerId)
                .orElseThrow(() -> new java.util.NoSuchElementException("Feedback not found for offer " + offerId));
        return toDto(fb);
    }

    @Transactional(readOnly = true)
    public FeedbackDto getById(Long feedbackId) {
        Feedback fb = feedbackRepo.findById(feedbackId)
                .filter(f -> !f.isDeleted())
                .orElseThrow(() -> new java.util.NoSuchElementException("Feedback " + feedbackId + " not found"));
        return toDto(fb);
    }

    @Transactional(readOnly = true)
    public FreelancerSummaryDto getFreelancerSummary(Long freelancerId, Integer filterRating,
                                                      String sortField, String sortOrder,
                                                      int page, int size) {
        Sort sort = Sort.by(
                "asc".equalsIgnoreCase(sortOrder) ? Sort.Direction.ASC : Sort.Direction.DESC,
                "rating".equals(sortField) ? "ratingGlobal" : "createdAt"
        );
        Pageable pageable = PageRequest.of(page, size, sort);

        Page<Feedback> pageResult = (filterRating != null)
                ? feedbackRepo.findPublicByFreelancerIdAndRating(freelancerId, filterRating, pageable)
                : feedbackRepo.findPublicByFreelancerId(freelancerId, pageable);

        List<FeedbackDto> dtos = pageResult.getContent().stream()
                .map(this::toDto).collect(Collectors.toList());

        long total    = feedbackRepo.countByFreelancerId(freelancerId);
        long recommends = feedbackRepo.countRecommendationsByFreelancerId(freelancerId);
        Double avg    = feedbackRepo.avgRatingByFreelancerId(freelancerId);

        return FreelancerSummaryDto.builder()
                .freelancerId(freelancerId)
                .avgGlobal(avg != null ? Math.round(avg * 10.0) / 10.0 : 0)
                .totalFeedbacks(total)
                .totalRecommendations(recommends)
                .recommendationRate(total > 0 ? (double) recommends / total * 100 : 0)
                .feedbacks(dtos)
                .build();
    }

    // ── UPDATE ───────────────────────────────────────────────────────────────

    public FeedbackDto update(Long feedbackId, FeedbackUpdateRequest req, String clientEmail) {
        Feedback fb = feedbackRepo.findById(feedbackId)
                .filter(f -> !f.isDeleted())
                .orElseThrow(() -> new RuntimeException("Feedback " + feedbackId + " not found"));

        if (!fb.getClientEmail().equals(clientEmail)) {
            throw new SecurityException("Seul l'auteur peut modifier ce feedback");
        }
        if (fb.isLocked()) {
            throw new IllegalStateException("Feedback is locked: the freelancer has already replied");
        }

        // Spam validation — throws SpamDetectedException if blocked
        String spamFlag = spamService.validate(req.getComment());

        // Capture existing ratings BEFORE overwriting to detect changes
        boolean ratingsChanged = fb.getRatingCommunication() != req.getRatingCommunication()
                || fb.getRatingQuality()         != req.getRatingQuality()
                || fb.getRatingDeadline()        != req.getRatingDeadline()
                || fb.getRatingProfessionalism() != req.getRatingProfessionalism();

        fb.setRatingCommunication(req.getRatingCommunication());
        fb.setRatingQuality(req.getRatingQuality());
        fb.setRatingDeadline(req.getRatingDeadline());
        fb.setRatingProfessionalism(req.getRatingProfessionalism());
        fb.setRatingGlobal((int) Math.round((req.getRatingCommunication() + req.getRatingQuality()
                + req.getRatingDeadline() + req.getRatingProfessionalism()) / 4.0));
        fb.setComment(req.getComment());
        fb.setRecommend(req.getRecommend());
        if (req.getAttachments() != null) {
            fb.setAttachments(joinAttachments(req.getAttachments()));
        }
        if (spamFlag != null) {
            fb.setFraudFlags(spamFlag);
        }

        fraudService.analyzeFeedback(fb);

        // Recompute AI only when ratings actually changed, or if the record never had AI fields
        // (e.g. legacy data). This reuses the cached DB values for unchanged feedbacks.
        if (ratingsChanged || fb.getAiSentiment() == null) {
            aiService.computeAIFields(fb);
        }

        Feedback saved = feedbackRepo.save(fb);
        return toDto(saved);
    }

    // ── DELETE ───────────────────────────────────────────────────────────────

    public void delete(Long feedbackId, String clientEmail) {
        Feedback fb = feedbackRepo.findById(feedbackId)
                .filter(f -> !f.isDeleted())
                .orElseThrow(() -> new RuntimeException("Feedback " + feedbackId + " not found"));

        if (!fb.getClientEmail().equals(clientEmail)) {
            throw new SecurityException("Seul l'auteur peut supprimer ce feedback");
        }
        if (fb.isLocked()) {
            throw new IllegalStateException("Feedback is locked: the freelancer has already replied");
        }

        fb.setDeleted(true);
        feedbackRepo.save(fb);
        log.info("[FEEDBACK] Soft-deleted feedback {}", feedbackId);
    }

    // ── ADMIN ────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<FeedbackDto> getFlagged(float minScore) {
        return feedbackRepo.findByDeletedFalseAndFraudScoreGreaterThanEqual(minScore)
                .stream().map(this::toDto).collect(Collectors.toList());
    }

    // ── SPAM ATTEMPT PERSISTENCE ─────────────────────────────────────────────

    /**
     * Called when the client explicitly chooses "Submit for admin review" after a spam detection.
     * Validates ownership, then persists the pending feedback and closes the evaluation window.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void submitForReview(Long offerId, FeedbackRequest req) {
        EvaluationWindow window = windowRepo.findByOfferId(offerId)
                .orElseThrow(() -> new IllegalStateException("No evaluation window found for offer " + offerId));
        if (!window.isEvaluationPending()) {
            throw new IllegalStateException("The evaluation window is already closed for offer " + offerId);
        }
        if (!window.getClientEmail().equals(req.getClientEmail())) {
            throw new SecurityException("Only the project owner can submit feedback for review");
        }
        // Detect the spam reason non-destructively (may not throw — just get the flag)
        String spamReason = "spam_detected";
        try { spamService.validate(req.getComment()); }
        catch (SpamDetectedException e) { spamReason = e.getReason() != null ? e.getReason() : "spam_detected"; }

        saveSpamAttempt(window, req, spamReason);
        log.info("[SPAM] Client chose admin review for offer {} ({})", offerId, req.getClientEmail());
    }

    /**
     * Saves a spam/rejected feedback in its OWN transaction (REQUIRES_NEW) so it persists
     * even when the outer transaction rolls back. fraudScore=1.0 → visible in admin Flagged tab.
     * Closes the evaluation window so the client waits for admin validation.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void saveSpamAttempt(EvaluationWindow window, FeedbackRequest req, String spamReason) {
        try {
            int globalRating = (int) Math.round((req.getRatingCommunication() + req.getRatingQuality()
                    + req.getRatingDeadline() + req.getRatingProfessionalism()) / 4.0);
            Feedback spam = Feedback.builder()
                    .offerId(window.getOfferId())
                    .clientEmail(req.getClientEmail())
                    .freelancerId(window.getFreelancerId())
                    .projectTitle(window.getProjectTitle())
                    .ratingCommunication(req.getRatingCommunication())
                    .ratingQuality(req.getRatingQuality())
                    .ratingDeadline(req.getRatingDeadline())
                    .ratingProfessionalism(req.getRatingProfessionalism())
                    .ratingGlobal(globalRating)
                    .comment(req.getComment())
                    .recommend(req.getRecommend())
                    .fraudScore(1.0f)
                    .fraudFlags("spam_detected," + spamReason)
                    .build();
            feedbackRepo.save(spam);
            // Close the evaluation window → user must wait for admin validation
            EvaluationWindow fresh = windowRepo.findById(window.getId()).orElse(window);
            fresh.setEvaluationPending(false);
            windowRepo.save(fresh);
            log.warn("[SPAM] Saved spam attempt for offer {} — reason: {}", window.getOfferId(), spamReason);
        } catch (Exception e) {
            log.error("[SPAM] Failed to persist spam attempt: {}", e.getMessage());
        }
    }

    // ── HELPERS ──────────────────────────────────────────────────────────────

    private static String joinAttachments(List<String> list) {
        if (list == null || list.isEmpty()) return null;
        return String.join(",", list);
    }

    private static List<String> splitAttachments(String raw) {
        if (raw == null || raw.isBlank()) return Collections.emptyList();
        return Arrays.asList(raw.split(","));
    }

    // ── MAPPER ───────────────────────────────────────────────────────────────

    public FeedbackDto toDto(Feedback fb) {
        ResponseFeedbackDto responseDto = null;
        if (fb.getResponse() != null) {
            ResponseFeedback r = fb.getResponse();
            responseDto = ResponseFeedbackDto.builder()
                    .id(r.getId())
                    .feedbackId(fb.getId())
                    .freelancerId(r.getFreelancerId())
                    .content(r.getContent())
                    .deleted(r.isDeleted())
                    .fraudScore(r.getFraudScore())
                    .aiSentiment(r.getAiSentiment())
                    .aiSentimentScore(r.getAiSentimentScore())
                    .aiTone(r.getAiTone())
                    .aiThemes(r.getAiThemes())
                    .attachments(splitAttachments(r.getAttachments()))
                    .createdAt(r.getCreatedAt())
                    .updatedAt(r.getUpdatedAt())
                    .build();
        }
        return FeedbackDto.builder()
                .id(fb.getId())
                .offerId(fb.getOfferId())
                .clientEmail(fb.getClientEmail())
                .freelancerId(fb.getFreelancerId())
                .projectTitle(fb.getProjectTitle())
                .ratingGlobal(fb.getRatingGlobal())
                .ratingCommunication(fb.getRatingCommunication())
                .ratingQuality(fb.getRatingQuality())
                .ratingDeadline(fb.getRatingDeadline())
                .ratingProfessionalism(fb.getRatingProfessionalism())
                .comment(fb.getComment())
                .recommend(fb.isRecommend())
                .locked(fb.isLocked())
                .deleted(fb.isDeleted())
                .fraudScore(fb.getFraudScore())
                .fraudFlags(fb.getFraudFlags())
                .aiSentiment(fb.getAiSentiment())
                .aiSentimentScore(fb.getAiSentimentScore())
                .aiTone(fb.getAiTone())
                .aiThemes(fb.getAiThemes())
                .attachments(splitAttachments(fb.getAttachments()))
                .sourceLang(fb.getSourceLang())
                .response(responseDto)
                .createdAt(fb.getCreatedAt())
                .updatedAt(fb.getUpdatedAt())
                .build();
    }
}
