package com.workify.formationservice.web.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class QuizResponse {
    private Double score;
    private boolean passed;
    private String message;
}
