package com.workify.formationservice.web.dto;

import lombok.Data;
import java.util.List;

@Data
public class QuestionRequest {
    private String text;
    private List<OptionRequest> options;
}
