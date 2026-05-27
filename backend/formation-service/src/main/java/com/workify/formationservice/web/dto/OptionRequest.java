package com.workify.formationservice.web.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

@Data
public class OptionRequest {
    private String text;
    @JsonProperty("isCorrect")
    private boolean isCorrect;
}
