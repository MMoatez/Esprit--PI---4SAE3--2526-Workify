package com.workify.rag.model;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@AllArgsConstructor
public class MessageDoc {
    private Long id;
    private Long conversationId;
    private Long senderId;
    private String text;
    private LocalDateTime createdAt;
}
