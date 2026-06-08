package com.workify.rag.model;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class SuggestionDto {
    private String text;
    private String tone;
}
