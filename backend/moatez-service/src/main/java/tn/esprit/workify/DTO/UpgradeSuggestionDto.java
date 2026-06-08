package tn.esprit.workify.DTO;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class UpgradeSuggestionDto {
    private boolean shouldSuggest;
    private String recommendedPlan;
    private String message;
    private String actionLabel;
    private long weeklyProjectActivity;
    private long weeklyUploads;
    private long monthlyProjectActivity;
    private long monthlyMeetings;
    private String currentPlan;
}
