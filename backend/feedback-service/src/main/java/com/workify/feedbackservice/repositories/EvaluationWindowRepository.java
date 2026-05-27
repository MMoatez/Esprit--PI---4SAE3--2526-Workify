package com.workify.feedbackservice.repositories;

import com.workify.feedbackservice.domains.EvaluationWindow;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface EvaluationWindowRepository extends JpaRepository<EvaluationWindow, Long> {

    Optional<EvaluationWindow> findByOfferId(Long offerId);

    boolean existsByOfferId(Long offerId);

    /** Fenêtres encore ouvertes pour un client donné (login-scan) */
    List<EvaluationWindow> findByClientEmailAndEvaluationPendingTrue(String clientEmail);

    /** Fenêtres encore ouvertes dont la deadline est passée */
    List<EvaluationWindow> findByEvaluationPendingTrueAndEvaluationDeadlineBefore(LocalDateTime now);

    /** Fenêtres ouvertes dont la deadline approche (rappel pas encore envoyé) */
    List<EvaluationWindow> findByEvaluationPendingTrueAndReminderSentFalseAndEvaluationDeadlineBefore(LocalDateTime threshold);

    /** Total contracts (evaluation windows) for a freelancer. */
    long countByFreelancerId(Long freelancerId);
}
