package com.workify.feedbackservice.web;

import com.workify.feedbackservice.dto.FeedbackTranslationDto;
import com.workify.feedbackservice.service.TranslationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/feedback")
@RequiredArgsConstructor
public class FeedbackTranslationController {

    private final TranslationService translationService;

    /**
     * GET /api/feedback/{id}/translate?lang=en
     * Returns a (cached) translation of the feedback comment.
     */
    @GetMapping("/{id}/translate")
    public ResponseEntity<FeedbackTranslationDto> translate(
            @PathVariable Long id,
            @RequestParam(defaultValue = "en") String lang) {
        return ResponseEntity.ok(translationService.getTranslation(id, lang));
    }
}
