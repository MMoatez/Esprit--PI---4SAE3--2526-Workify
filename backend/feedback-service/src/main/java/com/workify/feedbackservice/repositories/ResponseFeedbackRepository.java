package com.workify.feedbackservice.repositories;

import com.workify.feedbackservice.domains.ResponseFeedback;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.Optional;

public interface ResponseFeedbackRepository extends JpaRepository<ResponseFeedback, Long> {

    Optional<ResponseFeedback> findByFeedbackId(Long feedbackId);

    boolean existsByFeedbackId(Long feedbackId);

    /** Recherche par mot-clé dans le contenu de la réponse */
    @Query("SELECT r FROM ResponseFeedback r WHERE r.freelancerId = :freelancerId " +
           "AND LOWER(r.content) LIKE LOWER(CONCAT('%', :keyword, '%'))")
    Page<ResponseFeedback> searchByKeyword(Long freelancerId, String keyword, Pageable pageable);

    /** Toutes les réponses actives — pour re-classification complète au démarrage */
    java.util.List<ResponseFeedback> findByDeletedFalse();

    /** Réponses sans analyse AI (batch rétroactif — legacy) */
    java.util.List<ResponseFeedback> findByDeletedFalseAndAiToneIsNull();
}
