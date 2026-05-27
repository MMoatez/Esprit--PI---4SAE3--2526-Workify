package com.workify.feedbackservice.domains;

import jakarta.persistence.*;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Évaluation laissée par un client sur le travail d'un freelancer.
 * Une seule par offre (contrainte UNIQUE sur offerId).
 */
@Entity
@Table(name = "feedbacks")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Feedback {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Offre acceptée liée à ce feedback (project-service) */
    @Column(nullable = false, unique = true)
    private Long offerId;

    /** Email du client auteur du feedback */
    @Column(nullable = false)
    private String clientEmail;

    /** ID du freelancer évalué */
    @Column(nullable = false)
    private Long freelancerId;

    /** Titre du projet (dénormalisé) */
    private String projectTitle;

    // ── Notes détaillées (1-5) ────────────────────────────
    @Min(1) @Max(5)
    @Column(nullable = false)
    private int ratingGlobal;

    @Min(1) @Max(5)
    @Column(nullable = false)
    private int ratingCommunication;

    @Min(1) @Max(5)
    @Column(nullable = false)
    private int ratingQuality;

    @Min(1) @Max(5)
    @Column(nullable = false)
    private int ratingDeadline;

    @Min(1) @Max(5)
    @Column(nullable = false)
    private int ratingProfessionalism;

    @Size(min = 20, max = 2000)
    @Column(nullable = false, length = 2000)
    private String comment;

    @Column(nullable = false)
    private boolean recommend;

    // ── Cycle de vie ─────────────────────────────────────
    /** Suppression logique */
    @Builder.Default
    @Column(nullable = false)
    private boolean deleted = false;

    /** true après réponse du freelancer — bloque la modification client */
    @Builder.Default
    @Column(nullable = false)
    private boolean locked = false;

    // ── Détection fraude ─────────────────────────────────
    private Float fraudScore;

    @Column(length = 500)
    private String fraudFlags;

    // ── AI Analysis ───────────────────────────────────────
    @Column(length = 20)
    private String aiSentiment;      // POSITIVE, NEUTRAL, NEGATIVE

    private Float aiSentimentScore;

    @Column(length = 30)
    private String aiTone;           // enthusiastic, formal, casual, frustrated, disappointed

    @Column(length = 300)
    private String aiThemes;         // comma-separated: communication,deadline,...

    // ── Attachments ───────────────────────────────────────
    /** Comma-separated list of uploaded file URLs */
    @Column(length = 1000)
    private String attachments;

    // ── Language ──────────────────────────────────────────
    /** ISO 639-1 language code detected from the comment (e.g. "fr", "en", "ar") */
    @Column(length = 10)
    private String sourceLang;

    // ── Timestamps ───────────────────────────────────────
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @OneToOne(mappedBy = "feedback", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private ResponseFeedback response;

    @PrePersist
    void prePersist() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
