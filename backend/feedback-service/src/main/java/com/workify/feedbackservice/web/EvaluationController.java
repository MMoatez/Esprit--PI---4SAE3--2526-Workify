package com.workify.feedbackservice.web;

import com.workify.feedbackservice.dto.EvaluationStatusDto;
import com.workify.feedbackservice.dto.TriggerEvaluationRequest;
import com.workify.feedbackservice.service.EvaluationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/evaluation")
@RequiredArgsConstructor
public class EvaluationController {

    private final EvaluationService evaluationService;

    /**
     * Appelé par project-service quand une offre est acceptée.
     * Ouvre la fenêtre d'évaluation (1 min en mode test).
     */
    @PostMapping("/trigger")
    public ResponseEntity<EvaluationStatusDto> trigger(
            @Valid @RequestBody TriggerEvaluationRequest req) {
        return ResponseEntity.ok(evaluationService.triggerEvaluation(req));
    }

    /**
     * Consulté par le frontend pour afficher/masquer le bouton "Donner un feedback"
     * et le countdown.
     */
    @GetMapping("/offer/{offerId}/status")
    public ResponseEntity<EvaluationStatusDto> getStatus(@PathVariable Long offerId) {
        return ResponseEntity.ok(evaluationService.getStatus(offerId));
    }

    /**
     * Login-scan: returns all pending evaluation windows for a client email.
     * Called by the frontend on login to recover missed WebSocket notifications.
     */
    @GetMapping("/pending")
    public ResponseEntity<List<EvaluationStatusDto>> getPending(
            @RequestParam String clientEmail) {
        return ResponseEntity.ok(evaluationService.getPendingForClient(clientEmail));
    }
}
