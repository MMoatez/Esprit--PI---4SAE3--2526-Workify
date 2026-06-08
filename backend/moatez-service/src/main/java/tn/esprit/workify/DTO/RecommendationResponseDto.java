package tn.esprit.workify.DTO;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class RecommendationResponseDto {
    private String recommendedPlan;
    private String message;
    private List<String> reasons;
    private Integer confidence;
    private String actionLabel;
}
