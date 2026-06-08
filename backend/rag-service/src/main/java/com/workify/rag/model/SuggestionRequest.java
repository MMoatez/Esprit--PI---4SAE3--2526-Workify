package com.workify.rag.model;

import lombok.Data;

import java.util.List;

@Data
public class SuggestionRequest {
    private Long userId;
    private Long conversationId;
    private String message; // current user message/draft
    private List<Long> recentMessageIds; // optional
}
