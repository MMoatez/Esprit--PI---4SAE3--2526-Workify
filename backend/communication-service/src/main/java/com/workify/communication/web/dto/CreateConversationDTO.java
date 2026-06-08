package com.workify.communication.web.dto;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateConversationDTO {
    private Long receiverId;
    private String title;
    private String themeColor;
    private String emojiIcon;
}