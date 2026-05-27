package com.workify.feedbackservice.web;

import com.workify.feedbackservice.dto.ResponseFeedbackDto;
import com.workify.feedbackservice.dto.ResponseFeedbackRequest;
import com.workify.feedbackservice.service.ResponseFeedbackService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/response-feedback")
@RequiredArgsConstructor
public class ResponseFeedbackController {

    private final ResponseFeedbackService responseService;

    /**
     * POST /api/response-feedback/feedback/{feedbackId}
     * Freelancer crée sa réponse. Verrouille le feedback.
     */
    @PostMapping("/feedback/{feedbackId}")
    public ResponseEntity<ResponseFeedbackDto> create(
            @PathVariable Long feedbackId,
            @Valid @RequestBody ResponseFeedbackRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(responseService.create(feedbackId, req));
    }

    /**
     * GET /api/response-feedback/feedback/{feedbackId}
     */
    @GetMapping("/feedback/{feedbackId}")
    public ResponseEntity<ResponseFeedbackDto> getByFeedback(@PathVariable Long feedbackId) {
        ResponseFeedbackDto dto = responseService.getByFeedbackId(feedbackId);
        return dto != null ? ResponseEntity.ok(dto) : ResponseEntity.noContent().build();
    }

    /**
     * PUT /api/response-feedback/{responseId}
     */
    @PutMapping("/{responseId}")
    public ResponseEntity<ResponseFeedbackDto> update(
            @PathVariable Long responseId,
            @Valid @RequestBody ResponseFeedbackRequest req) {
        return ResponseEntity.ok(responseService.update(responseId, req));
    }

    /**
     * DELETE /api/response-feedback/{responseId}
     * Suppression logique. Déverrouille le feedback.
     */
    @DeleteMapping("/{responseId}")
    public ResponseEntity<Void> delete(
            @PathVariable Long responseId,
            @RequestParam Long freelancerId) {
        responseService.delete(responseId, freelancerId);
        return ResponseEntity.noContent().build();
    }

    /**
     * GET /api/response-feedback/search
     * Recherche par mot-clé dans les réponses d'un freelancer.
     */
    @GetMapping("/search")
    public ResponseEntity<Page<ResponseFeedbackDto>> search(
            @RequestParam Long freelancerId,
            @RequestParam String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(responseService.searchByKeyword(freelancerId, keyword, page, size));
    }
}
