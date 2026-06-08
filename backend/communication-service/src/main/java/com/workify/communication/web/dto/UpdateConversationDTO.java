package com.workify.communication.web.dto;

import com.workify.communication.enums.ConversationStatus;
import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateConversationDTO {
    private String             title;
    private String             themeColor;
    private String             emojiIcon;
    private Boolean            isFavorite;
    private Boolean            isArchived;
    private ConversationStatus status;
    private Long               blockedById;
}