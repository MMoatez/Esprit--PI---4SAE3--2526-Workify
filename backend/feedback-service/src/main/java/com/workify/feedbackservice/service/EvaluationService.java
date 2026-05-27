package com.workify.feedbackservice.service;

import com.workify.feedbackservice.domains.EvaluationWindow;
import com.workify.feedbackservice.domains.FeedbackNotification;
import com.workify.feedbackservice.dto.EvaluationStatusDto;
import com.workify.feedbackservice.dto.TriggerEvaluationRequest;
import com.workify.feedbackservice.repositories.EvaluationWindowRepository;
import com.workify.feedbackservice.repositories.FeedbackRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class EvaluationService {

    private final EvaluationWindowRepository windowRepo;
    private final FeedbackRepository         feedbackRepo;
    private final SimpMessagingTemplate      messaging;

    @Value("${feedback.evaluation.deadline-hours:24}")
    private int deadlineHours;

    // ── TRIGGER (appelé par project-service via REST) ─────────────────────────

    public EvaluationStatusDto triggerEvaluation(TriggerEvaluationRequest req) {

        // Idempotent : si la fenêtre existe déjà, on retourne son état
        if (windowRepo.existsByOfferId(req.getOfferId())) {
            return getStatus(req.getOfferId());
        }

        LocalDateTime deadline = LocalDateTime.now().plusHours(deadlineHours);

        EvaluationWindow window = EvaluationWindow.builder()
                .offerId(req.getOfferId())
                .clientEmail(req.getClientEmail())
                .freelancerId(req.getFreelancerId())
                .projectTitle(req.getProjectTitle())
                .evaluationDeadline(deadline)
                .build();

        windowRepo.save(window);

        // Notifier le client via WebSocket
        long seconds = deadlineHours * 3600L;
        FeedbackNotification notif = FeedbackNotification.evaluationPending(
                req.getOfferId(), req.getProjectTitle(), seconds);
        messaging.convertAndSend(
                "/topic/client-" + req.getClientEmail() + "-notifications", notif);

        log.info("[EVAL] Fenêtre ouverte pour offre {} — deadline: {}", req.getOfferId(), deadline);
        return getStatus(req.getOfferId());
    }

    // ── STATUS ────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public EvaluationStatusDto getStatus(Long offerId) {
        EvaluationWindow window = windowRepo.findByOfferId(offerId).orElse(null);

        if (window == null) {
            return EvaluationStatusDto.builder()
                    .offerId(offerId)
                    .evaluationPending(false)
                    .secondsRemaining(0)
                    .hasFeedback(false)
                    .build();
        }

        long secondsLeft = Math.max(0,
                ChronoUnit.SECONDS.between(LocalDateTime.now(), window.getEvaluationDeadline()));

        return EvaluationStatusDto.builder()
                .offerId(offerId)
                .evaluationPending(window.isEvaluationPending() && secondsLeft > 0)
                .evaluationDeadline(window.getEvaluationDeadline())
                .secondsRemaining(secondsLeft)
                .hasFeedback(feedbackRepo.existsByOfferIdAndDeletedFalse(offerId))
                .projectTitle(window.getProjectTitle())
                .build();
    }

    // ── PENDING LIST (login-scan) ─────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<EvaluationStatusDto> getPendingForClient(String clientEmail) {
        return windowRepo.findByClientEmailAndEvaluationPendingTrue(clientEmail)
                .stream()
                .map(w -> {
                    long secondsLeft = Math.max(0,
                            ChronoUnit.SECONDS.between(LocalDateTime.now(), w.getEvaluationDeadline()));
                    return EvaluationStatusDto.builder()
                            .offerId(w.getOfferId())
                            .evaluationPending(secondsLeft > 0)
                            .evaluationDeadline(w.getEvaluationDeadline())
                            .secondsRemaining(secondsLeft)
                            .hasFeedback(feedbackRepo.existsByOfferIdAndDeletedFalse(w.getOfferId()))
                            .projectTitle(w.getProjectTitle())
                            .build();
                })
                .filter(dto -> dto.isEvaluationPending() && !dto.isHasFeedback())
                .toList();
    }

    // ── CLOSE (appelé par le scheduler) ──────────────────────────────────────

    public void closeWindow(EvaluationWindow window) {
        window.setEvaluationPending(false);
        windowRepo.save(window);

        FeedbackNotification notif = FeedbackNotification.evaluationClosed(
                window.getOfferId(), window.getProjectTitle());
        messaging.convertAndSend(
                "/topic/client-" + window.getClientEmail() + "-notifications", notif);

        log.info("[EVAL] Fenêtre fermée pour offre {} (deadline expirée)", window.getOfferId());
    }

    // ── SEND REMINDER ─────────────────────────────────────────────────────────

    public void sendReminder(EvaluationWindow window) {
        long secondsLeft = Math.max(0,
                ChronoUnit.SECONDS.between(LocalDateTime.now(), window.getEvaluationDeadline()));

        FeedbackNotification notif = FeedbackNotification.evaluationReminder(
                window.getOfferId(), window.getProjectTitle(), secondsLeft);
        messaging.convertAndSend(
                "/topic/client-" + window.getClientEmail() + "-notifications", notif);

        window.setReminderSent(true);
        windowRepo.save(window);

        log.info("[EVAL] Rappel envoyé pour offre {} ({} sec restants)",
                window.getOfferId(), secondsLeft);
    }
}
