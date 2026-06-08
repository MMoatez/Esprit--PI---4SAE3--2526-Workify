package com.workify.communication.web.dto;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SendMessageRequest {
    private Long conversationId;
    private String content;
    private String contentType;  // TEXT, IMAGE, FILE, VIDEO
    private String senderRole;   // FREELANCER | CLIENT | ADMIN — optional, used for RAG indexing
    private String senderEmail;  // optional — passed by Angular from JWT; used for moderation emails
}