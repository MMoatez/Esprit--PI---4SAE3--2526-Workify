package com.workify.communication.web.dto;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateMessageRequest {
    private String content;
    private String reactionEmoji;
}