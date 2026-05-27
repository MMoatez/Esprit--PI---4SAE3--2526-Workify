package com.workify.feedbackservice.scheduler;

import com.workify.feedbackservice.domains.EvaluationWindow;
import com.workify.feedbackservice.repositories.EvaluationWindowRepository;
import com.workify.feedbackservice.service.EvaluationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Jobs planifiés pour gérer le cycle de vie des fenêtres d'évaluation.
 * En mode TEST : s'exécute toutes les 10 secondes.
 * En mode PROD : ajuster via scheduler.rate-ms dans application.properties.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class EvaluationScheduler {

    private final EvaluationWindowRepository windowRepo;
    private final EvaluationService          evaluationService;

    @Value("${feedback.evaluation.reminder-hours:1}")
    private long reminderHours;

    /**
     * Ferme les fenêtres dont la deadline est passée.
     */
    @Scheduled(fixedRateString = "${feedback.scheduler.rate-ms:10000}")
    public void closeExpiredWindows() {
        List<EvaluationWindow> expired = windowRepo
                .findByEvaluationPendingTrueAndEvaluationDeadlineBefore(LocalDateTime.now());

        if (!expired.isEmpty()) {
            log.info("[SCHEDULER] Fermeture de {} fenêtre(s) expirée(s)", expired.size());
            expired.forEach(evaluationService::closeWindow);
        }
    }

    /**
     * Envoie des rappels aux clients dont la deadline approche.
     * Rappel quand il reste <= reminderHours heures.
     */
    @Scheduled(fixedRateString = "${feedback.scheduler.rate-ms:10000}")
    public void sendReminders() {
        LocalDateTime threshold = LocalDateTime.now().plusHours(reminderHours);

        List<EvaluationWindow> aboutToExpire = windowRepo
                .findByEvaluationPendingTrueAndReminderSentFalseAndEvaluationDeadlineBefore(threshold);

        if (!aboutToExpire.isEmpty()) {
            log.info("[SCHEDULER] Envoi de {} rappel(s)", aboutToExpire.size());
            aboutToExpire.forEach(evaluationService::sendReminder);
        }
    }
}
