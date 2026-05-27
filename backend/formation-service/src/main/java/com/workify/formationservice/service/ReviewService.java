package com.workify.formationservice.service;

import com.workify.formationservice.domain.Enrollment;
import com.workify.formationservice.domain.EnrollmentStatus;
import com.workify.formationservice.domain.Formation;
import com.workify.formationservice.domain.Review;
import com.workify.formationservice.repository.EnrollmentRepository;
import com.workify.formationservice.repository.FormationRepository;
import com.workify.formationservice.repository.ReviewRepository;
import com.workify.formationservice.web.dto.ReviewRequest;
import com.workify.formationservice.web.dto.ReviewResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ReviewService {

    private final ReviewRepository reviewRepository;
    private final FormationRepository formationRepository;
    private final EnrollmentRepository enrollmentRepository;

    @Transactional
    public ReviewResponse createReview(ReviewRequest request, String userId) {
        log.info("Creating review for formation: {} by user: {}", request.getFormationId(), userId);

        Formation formation = formationRepository.findById(request.getFormationId())
                .orElseThrow(() -> new RuntimeException("Formation not found"));

        // Check if user has completed the course
        Enrollment enrollment = enrollmentRepository.findByFormationIdAndUserId(request.getFormationId(), userId)
                .orElseThrow(() -> new RuntimeException("You are not enrolled in this course"));

        if (enrollment.getStatus() != EnrollmentStatus.COMPLETED) {
            throw new RuntimeException("You must complete the course before rating it");
        }

        // Check if user already rated
        if (reviewRepository.existsByFormationIdAndUserId(request.getFormationId(), userId)) {
            throw new RuntimeException("You have already rated this course");
        }

        Review review = Review.builder()
                .rating(request.getRating())
                .comment(request.getComment())
                .userId(userId)
                .formation(formation)
                .build();

        Review saved = reviewRepository.save(review);
        return mapToResponse(saved);
    }

    public List<ReviewResponse> getReviewsByFormation(Long formationId) {
        return reviewRepository.findByFormationIdOrderByCreatedAtDesc(formationId)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public Double getAverageRating(Long formationId) {
        Double avg = reviewRepository.getAverageRatingByFormationId(formationId);
        return avg != null ? avg : 0.0;
    }

    private ReviewResponse mapToResponse(Review review) {
        return ReviewResponse.builder()
                .id(review.getId())
                .rating(review.getRating())
                .comment(review.getComment())
                .userId(review.getUserId())
                .formationId(review.getFormation().getId())
                .createdAt(review.getCreatedAt())
                .build();
    }
}
