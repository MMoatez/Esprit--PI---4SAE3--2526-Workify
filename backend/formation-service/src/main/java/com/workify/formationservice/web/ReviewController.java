package com.workify.formationservice.web;

import com.workify.formationservice.service.ReviewService;
import com.workify.formationservice.web.dto.ReviewRequest;
import com.workify.formationservice.web.dto.ReviewResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/reviews")
@RequiredArgsConstructor
@Slf4j
public class ReviewController {

    private final ReviewService reviewService;

    @PostMapping
    public ResponseEntity<ReviewResponse> createReview(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody ReviewRequest request) {
        String userId = jwt.getSubject();
        log.info("POST /api/reviews - User: {}", userId);
        return ResponseEntity.status(HttpStatus.CREATED).body(reviewService.createReview(request, userId));
    }

    @GetMapping("/formation/{formationId}")
    public ResponseEntity<List<ReviewResponse>> getReviewsByFormation(@PathVariable Long formationId) {
        log.info("GET /api/reviews/formation/{}", formationId);
        return ResponseEntity.ok(reviewService.getReviewsByFormation(formationId));
    }

    @GetMapping("/formation/{formationId}/average")
    public ResponseEntity<Double> getAverageRating(@PathVariable Long formationId) {
        log.info("GET /api/reviews/formation/{}/average", formationId);
        return ResponseEntity.ok(reviewService.getAverageRating(formationId));
    }
}
