package com.workify.rag.model;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.util.List;

@Data
@AllArgsConstructor
public class SuggestionResponse {
    private List<SuggestionDto> suggestions;
}
