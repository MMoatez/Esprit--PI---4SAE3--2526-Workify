package com.workify.feedbackservice.domains;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Cached translation of a feedback comment.
 * One row per (feedbackId, targetLang) pair.
 */
@Entity
@Table(name = "feedback_translations",
       uniqueConstraints = @UniqueConstraint(columnNames = {"feedback_id", "target_lang"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FeedbackTranslation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "feedback_id", nullable = false)
    private Long feedbackId;

    /** ISO 639-1 target language code (e.g. "en", "ar", "es") */
    @Column(name = "target_lang", nullable = false, length = 10)
    private String targetLang;

    /** Translated version of the feedback comment */
    @Column(nullable = false, length = 3000)
    private String translatedComment;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
