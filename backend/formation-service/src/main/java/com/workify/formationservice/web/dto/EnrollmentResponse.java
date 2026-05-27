package com.workify.formationservice.web.dto;

import com.workify.formationservice.domain.EnrollmentStatus;
import com.workify.formationservice.domain.Formation;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EnrollmentResponse {
    private Long id;
    private String userId;
    private Formation formation;
    private EnrollmentStatus status;
    private LocalDateTime enrolledAt;
    private LocalDateTime completedAt;
    private double progress; // Percentage 0-100
    private java.util.List<Long> completedLessonIds;
}
