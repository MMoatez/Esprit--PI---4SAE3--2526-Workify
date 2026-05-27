package com.workify.formationservice.web.dto;

import lombok.Data;
import java.util.List;

@Data
public class QuizRequest {
    private String title;
    private List<QuestionRequest> questions;
}
