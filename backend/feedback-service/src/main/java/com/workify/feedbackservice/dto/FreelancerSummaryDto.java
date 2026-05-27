package com.workify.feedbackservice.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class FreelancerSummaryDto {

    private Long freelancerId;
    private double avgGlobal;
    private double avgCommunication;
    private double avgQuality;
    private double avgDeadline;
    private double avgProfessionalism;
    private long totalFeedbacks;
    private long totalRecommendations;
    private double recommendationRate;
    private List<FeedbackDto> feedbacks;
}
