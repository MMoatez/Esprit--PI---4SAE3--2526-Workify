package tn.esprit.workify.services.recommendation;

import tn.esprit.workify.DTO.RecommendationQuizRequestDto;
import tn.esprit.workify.DTO.RecommendationResponseDto;
import tn.esprit.workify.DTO.UpgradeSuggestionDto;

public interface IRecommendationService {
    RecommendationResponseDto recommendPlan(RecommendationQuizRequestDto request);
    UpgradeSuggestionDto suggestUpgrade(Integer userId);
}
