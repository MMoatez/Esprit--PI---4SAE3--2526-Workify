package tn.esprit.workify.controllers;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import tn.esprit.workify.DTO.RecommendationQuizRequestDto;
import tn.esprit.workify.DTO.RecommendationResponseDto;
import tn.esprit.workify.DTO.UpgradeSuggestionDto;
import tn.esprit.workify.services.recommendation.IRecommendationService;

@RestController
@RequestMapping("/api/recommendation")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:4200")
public class RecommendationController {

    private final IRecommendationService recommendationService;

    @PostMapping("/plan")
    public ResponseEntity<RecommendationResponseDto> recommendPlan(@RequestBody RecommendationQuizRequestDto request) {
        return ResponseEntity.ok(recommendationService.recommendPlan(request));
    }

    @GetMapping("/upgrade")
    public ResponseEntity<UpgradeSuggestionDto> suggestUpgrade(@RequestParam Integer userId) {
        return ResponseEntity.ok(recommendationService.suggestUpgrade(userId));
    }
}
