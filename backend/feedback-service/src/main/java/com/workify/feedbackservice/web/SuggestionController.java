package com.workify.feedbackservice.web;

import com.workify.feedbackservice.service.SuggestionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * GET /api/feedback/suggestions?projectTitle=...&mode=feedback|reply
 * Returns domain-aware suggestion phrases powered by NLP.
 */
@RestController
@RequestMapping("/api/feedback/suggestions")
@RequiredArgsConstructor
public class SuggestionController {

    private final SuggestionService suggestionService;

    @GetMapping
    public ResponseEntity<List<String>> getSuggestions(
            @RequestParam(defaultValue = "") String projectTitle,
            @RequestParam(defaultValue = "feedback")  String mode) {
        return ResponseEntity.ok(suggestionService.getSuggestions(projectTitle, mode));
    }
}
