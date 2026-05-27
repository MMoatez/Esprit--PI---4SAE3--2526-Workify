package com.workify.formationservice.web;

import com.workify.formationservice.service.EnrollmentService;
import com.workify.formationservice.web.dto.EnrollmentResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/enrollments")
@RequiredArgsConstructor
@Slf4j
public class EnrollmentController {

    private final EnrollmentService enrollmentService;

    @PostMapping("/formation/{formationId}")
    public ResponseEntity<EnrollmentResponse> enroll(@AuthenticationPrincipal Jwt jwt, @PathVariable Long formationId) {
        String userId = jwt.getSubject();
        log.info("POST /api/enrollments/formation/{} - User: {}", formationId, userId);
        return ResponseEntity.ok(enrollmentService.enrollUser(userId, formationId));
    }

    @GetMapping("/my")
    public ResponseEntity<List<EnrollmentResponse>> getMyEnrollments(@AuthenticationPrincipal Jwt jwt) {
        String userId = jwt.getSubject();
        log.info("GET /api/enrollments/my - User: {}", userId);
        return ResponseEntity.ok(enrollmentService.getUserEnrollments(userId));
    }

    @GetMapping("/formation/{formationId}")
    public ResponseEntity<EnrollmentResponse> getEnrollment(@AuthenticationPrincipal Jwt jwt,
            @PathVariable Long formationId) {
        String userId = jwt.getSubject();
        log.info("GET /api/enrollments/formation/{} - User: {}", formationId, userId);
        return enrollmentService.getEnrollment(userId, formationId)
                .map(enrollment -> {
                    log.info("Enrollment found for user {} and formation {}", userId, formationId);
                    return ResponseEntity.ok(enrollment);
                })
                .orElseGet(() -> {
                    log.info("No enrollment found for user {} and formation {}", userId, formationId);
                    return ResponseEntity.notFound().build();
                });
    }

    @PostMapping("/lesson/{lessonId}/complete")
    public ResponseEntity<Void> completeLesson(@AuthenticationPrincipal Jwt jwt, @PathVariable Long lessonId) {
        String userId = jwt.getSubject();
        enrollmentService.completeLesson(userId, lessonId);
        return ResponseEntity.ok().build();
    }
}
