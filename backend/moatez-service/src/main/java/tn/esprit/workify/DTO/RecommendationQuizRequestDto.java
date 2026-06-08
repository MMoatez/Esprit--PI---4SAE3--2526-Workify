package tn.esprit.workify.DTO;

import lombok.Data;

@Data
public class RecommendationQuizRequestDto {
    private String role;
    private String projectsPerMonth;
    private String messagingUsage;
    private String visibilityNeed;
    private Boolean advancedStats;
    private Integer userId;
}
