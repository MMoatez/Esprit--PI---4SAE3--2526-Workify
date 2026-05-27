package com.workify.formationservice.service;

import com.workify.formationservice.domain.*;
import com.workify.formationservice.repository.*;
import com.workify.formationservice.web.dto.EnrollmentResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@Slf4j
@RequiredArgsConstructor
public class EnrollmentService {

    private final EnrollmentRepository enrollmentRepository;
    private final LessonProgressRepository lessonProgressRepository;
    private final FormationRepository formationRepository;
    private final LessonRepository lessonRepository;

    @Transactional
    public EnrollmentResponse enrollUser(String userId, Long formationId) {
        Formation formation = formationRepository.findById(formationId)
                .orElseThrow(() -> new RuntimeException("Formation not found"));

        Enrollment enrollment = enrollmentRepository.findByUserIdAndFormationId(userId, formationId)
                .orElseGet(() -> {
                    log.info("Creating new enrollment for user {} in formation {}", userId, formationId);
                    return enrollmentRepository.save(Enrollment.builder()
                            .userId(userId)
                            .formation(formation)
                            .status(EnrollmentStatus.ENROLLED)
                            .enrolledAt(LocalDateTime.now())
                            .build());
                });

        log.info("User {} enrolled in formation {}. Enrollment ID: {}", userId, formationId, enrollment.getId());
        return toResponse(enrollment);
    }

    public List<EnrollmentResponse> getUserEnrollments(String userId) {
        log.info("Fetching enrollments for user {}", userId);
        return enrollmentRepository.findByUserId(userId).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public Optional<EnrollmentResponse> getEnrollment(String userId, Long formationId) {
        return enrollmentRepository.findByUserIdAndFormationId(userId, formationId)
                .map(this::toResponse);
    }

    public EnrollmentResponse toResponse(Enrollment enrollment) {
        String userId = enrollment.getUserId();
        Long formationId = enrollment.getFormation().getId();

        double progress = calculateProgress(userId, formationId);

        List<Long> completedLessonIds = lessonProgressRepository
                .findByUserIdAndLessonChapterFormationId(userId, formationId)
                .stream()
                .filter(LessonProgress::isCompleted)
                .map(lp -> lp.getLesson().getId())
                .collect(Collectors.toList());

        return EnrollmentResponse.builder()
                .id(enrollment.getId())
                .userId(userId)
                .formation(enrollment.getFormation())
                .status(enrollment.getStatus())
                .enrolledAt(enrollment.getEnrolledAt())
                .completedAt(enrollment.getCompletedAt())
                .progress(progress)
                .completedLessonIds(completedLessonIds)
                .build();
    }

    private double calculateProgress(String userId, Long formationId) {
        long totalLessons = lessonRepository.countByChapterFormationId(formationId);
        if (totalLessons == 0)
            return 0;

        long completedLessons = lessonProgressRepository.findByUserIdAndLessonChapterFormationId(userId, formationId)
                .stream().filter(LessonProgress::isCompleted).count();

        return Math.round((double) completedLessons / totalLessons * 100.0);
    }

    @Transactional
    public void completeLesson(String userId, Long lessonId) {
        Lesson lesson = lessonRepository.findById(lessonId)
                .orElseThrow(() -> new RuntimeException("Lesson not found"));

        LessonProgress progress = lessonProgressRepository.findByUserIdAndLessonId(userId, lessonId)
                .orElse(LessonProgress.builder()
                        .userId(userId)
                        .lesson(lesson)
                        .build());

        if (!progress.isCompleted()) {
            progress.setCompleted(true);
            progress.setCompletedAt(LocalDateTime.now());
            lessonProgressRepository.save(progress);
            log.info("User {} completed lesson {}", userId, lessonId);

            checkAndCompleteFormation(userId, lesson.getChapter().getFormation().getId());
        }
    }

    private void checkAndCompleteFormation(String userId, Long formationId) {
        // We no longer auto-complete or auto-issue certificates here.
        // Completion and certification are now handled via the Quiz submission.
        log.info("User {} finished all lessons for formation {}. They can now take the final quiz.", userId, formationId);
    }
}
