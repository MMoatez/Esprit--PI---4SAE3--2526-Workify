package com.workify.feedbackservice.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class FeedbackTranslationDto {
    private Long    feedbackId;
    private String  sourceLang;
    private String  targetLang;
    private String  translatedComment;
    private boolean cached;
}
