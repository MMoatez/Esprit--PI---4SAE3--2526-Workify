package com.workify.projectservice.weeb;

import com.workify.projectservice.dto.RecommendRequest;
import com.workify.projectservice.dto.RecommendResponse;
import com.workify.projectservice.service.RecommendationService;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/recommendation")
@CrossOrigin("*")
public class RecommendationController {

    private final RecommendationService recommendationService;

    public RecommendationController(RecommendationService recommendationService) {
        this.recommendationService = recommendationService;
    }

    @PostMapping(
            consumes = MediaType.APPLICATION_JSON_VALUE,
            produces = MediaType.APPLICATION_JSON_VALUE
    )
    public ResponseEntity<RecommendResponse> recommend(
            @RequestBody RecommendRequest request) {

        RecommendResponse response = recommendationService.recommend(request);

        return ResponseEntity.ok(response);
    }
}