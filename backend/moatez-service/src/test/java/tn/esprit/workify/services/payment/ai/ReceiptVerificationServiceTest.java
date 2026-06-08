package tn.esprit.workify.services.payment.ai;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import tn.esprit.workify.DTO.payment.ReceiptAiValidationResponseDto;
import tn.esprit.workify.DTO.payment.ReceiptDecisionResult;
import tn.esprit.workify.DTO.payment.ReceiptDecisionStatus;

import static org.junit.jupiter.api.Assertions.assertEquals;

class ReceiptVerificationServiceTest {

    private ReceiptVerificationService service;

    @BeforeEach
    void setUp() {
        service = new ReceiptVerificationService(null, new ObjectMapper());
    }

    @Test
    void shouldApproveWhenConfidenceGreaterThan80() {
        ReceiptAiValidationResponseDto ai = new ReceiptAiValidationResponseDto();
        ai.setConfidence(87.0);
        ai.setStatus("VALID");

        ReceiptDecisionResult result = service.applyDecision(ai);

        assertEquals(ReceiptDecisionStatus.APPROVED, result.getDecision());
        assertEquals(87.0, result.getConfidence());
    }

    @Test
    void shouldSetPendingWhenConfidenceBetween50And80() {
        ReceiptAiValidationResponseDto ai = new ReceiptAiValidationResponseDto();
        ai.setConfidence(65.0);
        ai.setStatus("SUSPICIOUS");

        ReceiptDecisionResult result = service.applyDecision(ai);

        assertEquals(ReceiptDecisionStatus.PENDING_ADMIN_VALIDATION, result.getDecision());
        assertEquals(65.0, result.getConfidence());
    }

    @Test
    void shouldRejectWhenConfidenceLowerThan50() {
        ReceiptAiValidationResponseDto ai = new ReceiptAiValidationResponseDto();
        ai.setConfidence(42.0);
        ai.setStatus("INVALID");

        ReceiptDecisionResult result = service.applyDecision(ai);

        assertEquals(ReceiptDecisionStatus.REJECTED, result.getDecision());
        assertEquals(42.0, result.getConfidence());
    }
}
