package com.workify.feedbackservice.service;

import com.workify.feedbackservice.domains.Feedback;
import com.workify.feedbackservice.domains.FeedbackNotification;
import com.workify.feedbackservice.domains.ResponseFeedback;
import com.workify.feedbackservice.dto.ResponseFeedbackDto;
import com.workify.feedbackservice.dto.ResponseFeedbackRequest;
import com.workify.feedbackservice.repositories.FeedbackRepository;
import com.workify.feedbackservice.repositories.ResponseFeedbackRepository;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class ResponseFeedbackService {

    private final ResponseFeedbackRepository responseRepo;
    private final FeedbackRepository         feedbackRepo;
    private final FraudDetectionService      fraudService;
    private final SpamDetectionService       spamService;
    private final SimpMessagingTemplate      messaging;
    private final FeedbackAIService          aiService;

    // ── CREATE ────────────────────────────────────────────────────────────────

    public ResponseFeedbackDto create(Long feedbackId, ResponseFeedbackRequest req) {

        Feedback feedback = feedbackRepo.findById(feedbackId)
                .filter(f -> !f.isDeleted())
                .orElseThrow(() -> new RuntimeException("Feedback " + feedbackId + " not found"));

        if (!feedback.getFreelancerId().equals(req.getFreelancerId())) {
            throw new SecurityException("Only the assigned freelancer can reply to this feedback");
        }
        if (responseRepo.existsByFeedbackId(feedbackId)) {
            throw new IllegalStateException("A reply already exists for this feedback");
        }

        // Spam validation — throws SpamDetectedException if blocked
        String spamFlag = spamService.validate(req.getContent());

        ResponseFeedback response = ResponseFeedback.builder()
                .feedback(feedback)
                .freelancerId(req.getFreelancerId())
                .content(req.getContent())
                .attachments(joinAttachments(req.getAttachments()))
                .build();

        if (spamFlag != null) {
            response.setFraudScore(Math.max(response.getFraudScore(), 0.4f));
        }

        fraudService.analyzeResponse(response);

        // AI classification — synchronous, keyword-based, instant
        aiService.computeResponseAIFields(response);

        response = responseRepo.save(response);

        // Verrouiller le feedback (client ne peut plus modifier)
        feedback.setLocked(true);
        feedbackRepo.save(feedback);

        // Notifier le client via WebSocket
        FeedbackNotification notif = FeedbackNotification.responseReceived(
                feedbackId, feedback.getProjectTitle());
        messaging.convertAndSend(
                "/topic/client-" + feedback.getClientEmail() + "-notifications", notif);

        log.info("[RESPONSE] Reply created for feedback {}", feedbackId);
        return toDto(response);
    }

    // ── READ ─────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public ResponseFeedbackDto getByFeedbackId(Long feedbackId) {
        return responseRepo.findByFeedbackId(feedbackId)
                .map(this::toDto)
                .orElse(null);
    }

    @Transactional(readOnly = true)
    public Page<ResponseFeedbackDto> searchByKeyword(Long freelancerId, String keyword, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        return responseRepo.searchByKeyword(freelancerId, keyword, pageable).map(this::toDto);
    }

    // ── UPDATE ────────────────────────────────────────────────────────────────

    public ResponseFeedbackDto update(Long responseId, ResponseFeedbackRequest req) {
        ResponseFeedback response = responseRepo.findById(responseId)
                .filter(r -> !r.isDeleted())
                .orElseThrow(() -> new RuntimeException("Reply " + responseId + " not found"));

        if (!response.getFreelancerId().equals(req.getFreelancerId())) {
            throw new SecurityException("Only the author can edit this reply");
        }

        // Spam validation — throws SpamDetectedException if blocked
        String spamFlag = spamService.validate(req.getContent());

        response.setContent(req.getContent());
        if (req.getAttachments() != null) {
            response.setAttachments(joinAttachments(req.getAttachments()));
        }
        if (spamFlag != null) {
            response.setFraudScore(Math.max(response.getFraudScore(), 0.4f));
        }
        fraudService.analyzeResponse(response);

        // Re-classify synchronously with updated content
        aiService.computeResponseAIFields(response);

        response = responseRepo.save(response);
        return toDto(response);
    }

    // ── DELETE ────────────────────────────────────────────────────────────────

    public void delete(Long responseId, Long freelancerId) {
        ResponseFeedback response = responseRepo.findById(responseId)
                .filter(r -> !r.isDeleted())
                .orElseThrow(() -> new RuntimeException("Reply " + responseId + " not found"));

        // Déverrouiller le feedback (client peut re-éditer)
        Feedback feedback = response.getFeedback();

        // Check via feedback.freelancerId too (response.freelancerId may be 0 if stored before fix)
        if (!feedback.getFreelancerId().equals(freelancerId) && !response.getFreelancerId().equals(freelancerId)) {
            throw new SecurityException("Only the author can delete this reply");
        }

        // Break cascade link BEFORE saving feedback — prevents CascadeType.ALL re-saving the response
        feedback.setResponse(null);
        feedback.setLocked(false);
        feedbackRepo.saveAndFlush(feedback);

        // Hard delete — suppression physique
        responseRepo.deleteById(responseId);
        responseRepo.flush();

        log.info("[RESPONSE] Deleted reply {}", responseId);
    }

    // ── HELPERS ───────────────────────────────────────────────────────────────

    private static String joinAttachments(List<String> list) {
        if (list == null || list.isEmpty()) return null;
        return String.join(",", list);
    }

    private static List<String> splitAttachments(String raw) {
        if (raw == null || raw.isBlank()) return Collections.emptyList();
        return Arrays.asList(raw.split(","));
    }

    // ── MAPPER ────────────────────────────────────────────────────────────────

    private ResponseFeedbackDto toDto(ResponseFeedback r) {
        return ResponseFeedbackDto.builder()
                .id(r.getId())
                .feedbackId(r.getFeedback().getId())
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
}
