package com.workify.feedbackservice.repositories;

import com.workify.feedbackservice.domains.FeedbackTranslation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface FeedbackTranslationRepository extends JpaRepository<FeedbackTranslation, Long> {

    Optional<FeedbackTranslation> findByFeedbackIdAndTargetLang(Long feedbackId, String targetLang);
}
