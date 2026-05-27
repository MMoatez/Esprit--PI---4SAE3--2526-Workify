package com.workify.feedbackservice.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class FeedbackDto {

    private Long id;
    private Long offerId;
    private String clientEmail;
    private Long freelancerId;
    private String projectTitle;

    private int ratingGlobal;
    private int ratingCommunication;
    private int ratingQuality;
    private int ratingDeadline;
    private int ratingProfessionalism;

    private String comment;
    private boolean recommend;
    private boolean locked;
    private boolean deleted;

    private Float fraudScore;
    private String fraudFlags;

    // AI Analysis
    private String aiSentiment;
    private Float aiSentimentScore;
    private String aiTone;
    private String aiThemes;

    private List<String> attachments;
    private String sourceLang;

    private ResponseFeedbackDto response;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
