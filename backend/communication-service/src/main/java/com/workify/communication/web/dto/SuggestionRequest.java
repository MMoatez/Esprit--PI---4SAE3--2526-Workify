package com.workify.communication.web.dto;

import lombok.Data;

@Data
public class SuggestionRequest {
    private Long userId;
    private Long conversationId;
    private String draft;
    private String userRole; // FREELANCER | CLIENT | ADMIN — optional, defaults to CLIENT
    private int offset;      // rotation index — 0 on first call, incremented by frontend each subsequent call for same draft
}

