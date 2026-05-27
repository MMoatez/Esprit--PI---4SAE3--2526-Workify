package com.workify.formationservice.web.dto;

import lombok.Data;
import java.util.Map;

@Data
public class QuizSubmissionRequest {
    private String userId;
    private Map<Long, Long> answers; // QuestionId -> OptionId
}
