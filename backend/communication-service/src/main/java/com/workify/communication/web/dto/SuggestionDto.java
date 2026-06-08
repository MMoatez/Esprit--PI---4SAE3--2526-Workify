package com.workify.communication.web.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class SuggestionDto {
    private String text;
    private String tone; // e.g., friendly, formal, short
}
