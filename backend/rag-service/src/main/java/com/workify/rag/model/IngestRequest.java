package com.workify.rag.model;

import lombok.Data;

@Data
public class IngestRequest {
    private Long messageId;
    private Long conversationId;
    private Long senderId;
    private String content;
}
