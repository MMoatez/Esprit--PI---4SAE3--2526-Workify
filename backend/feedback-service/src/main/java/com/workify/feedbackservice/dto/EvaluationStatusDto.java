package com.workify.feedbackservice.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class EvaluationStatusDto {

    private Long offerId;
    private boolean evaluationPending;
    private LocalDateTime evaluationDeadline;
    private long secondsRemaining;
    private boolean hasFeedback;
    private String projectTitle;
}
