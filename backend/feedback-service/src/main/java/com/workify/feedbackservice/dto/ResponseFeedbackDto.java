package com.workify.feedbackservice.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class ResponseFeedbackDto {

    private Long id;
    private Long feedbackId;
    private Long freelancerId;
    private String content;
    private boolean deleted;
    private Float fraudScore;
    private String aiSentiment;
    private Float aiSentimentScore;
    private String aiTone;
    private String aiThemes;
    private List<String> attachments;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
