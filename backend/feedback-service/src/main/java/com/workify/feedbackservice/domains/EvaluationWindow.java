package com.workify.feedbackservice.domains;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Fenêtre d'évaluation ouverte suite à une offre acceptée.
 * Une par offre. Gérée par le scheduler (fermeture auto après deadline).
 */
@Entity
@Table(name = "evaluation_windows")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EvaluationWindow {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** ID de l'offre concernée (dans project-service) */
    @Column(nullable = false, unique = true)
    private Long offerId;

    /** Email du client (propriétaire du projet) */
    @Column(nullable = false)
    private String clientEmail;

    /** ID du freelancer (dans project-service) */
    @Column(nullable = false)
    private Long freelancerId;

    /** Titre du projet (dénormalisé pour affichage) */
    private String projectTitle;

    /** true = fenêtre ouverte, client peut déposer un feedback */
    @Builder.Default
    @Column(nullable = false)
    private boolean evaluationPending = true;

    /** Deadline absolue (NOW + 1 min en test mode) */
    @Column(nullable = false)
    private LocalDateTime evaluationDeadline;

    /** true = rappel envoyé (évite les doublons) */
    @Builder.Default
    @Column(nullable = false)
    private boolean reminderSent = false;

    private LocalDateTime createdAt;

    @PrePersist
    void prePersist() {
        createdAt = LocalDateTime.now();
    }
}
