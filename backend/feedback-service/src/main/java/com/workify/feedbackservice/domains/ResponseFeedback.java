package com.workify.feedbackservice.domains;

import jakarta.persistence.*;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Réponse d'un freelancer à un feedback client.
 * Une seule réponse par feedback (contrainte UNIQUE sur feedbackId).
 */
@Entity
@Table(name = "response_feedbacks")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ResponseFeedback {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Feedback auquel cette réponse est liée */
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "feedback_id", nullable = false)
    private Feedback feedback;

    /** ID du freelancer qui répond */
    @Column(nullable = false)
    private Long freelancerId;

    @Size(min = 10, max = 1000)
    @Column(nullable = false, length = 1000)
    private String content;

    /** Suppression logique */
    @Builder.Default
    @Column(nullable = false)
    private boolean deleted = false;

    // ── Détection fraude ─────────────────────────────────
    private Float fraudScore;

    @Column(length = 500)
    private String fraudFlags;

    // ── AI Analysis ──────────────────────────────────────
    @Column(length = 20)
    private String aiSentiment;

    private Float aiSentimentScore;

    @Column(length = 50)
    private String aiTone;

    @Column(length = 200)
    private String aiThemes;

    // ── Attachments ───────────────────────────────────────
    /** Comma-separated list of uploaded file URLs */
    @Column(length = 1000)
    private String attachments;

    // ── Timestamps ───────────────────────────────────────
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

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
