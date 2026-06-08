package tn.esprit.workify.controllers;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import tn.esprit.workify.DTO.payment.*;
import tn.esprit.workify.entities.subscription.AiValidationStatus;
import tn.esprit.workify.services.payment.ai.ReceiptVerificationService;

import java.math.BigDecimal;

@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:4200")
@Slf4j
public class PaymentVerificationController {

    private final ReceiptVerificationService receiptVerificationService;

    @PostMapping("/verify-receipt")
    public ResponseEntity<VerifyReceiptResponseDto> verifyReceipt(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "expectedAmount", required = false) BigDecimal expectedAmount,
            @RequestParam(value = "expectedBank", required = false) String expectedBank) {

        log.debug("/api/payments/verify-receipt called: originalFilename={}, size={}, expectedAmount={}, expectedBank={}",
            file != null ? file.getOriginalFilename() : null,
            file != null ? file.getSize() : null,
            expectedAmount,
            expectedBank);

        ReceiptDecisionResult result = receiptVerificationService.verifyUploadedReceipt(
                file,
                expectedAmount,
                expectedBank
        );

        VerifyReceiptResponseDto response = VerifyReceiptResponseDto.builder()
                .confidence(result.getConfidence())
                .aiValidationStatus(toAiStatus(result.getDecision()))
                .modelStatus(result.getModelStatus())
                .message(result.getMessage())
            .extractedData(result.getExtractedData())
                .reasons(result.getReasons())
                .build();

            log.debug("/api/payments/verify-receipt result: decision={}, confidence={}, modelStatus={}",
                result.getDecision(), result.getConfidence(), result.getModelStatus());

        return ResponseEntity.ok(response);
    }

    private AiValidationStatus toAiStatus(ReceiptDecisionStatus status) {
        return switch (status) {
            case APPROVED -> AiValidationStatus.APPROVED;
            case PENDING_ADMIN_VALIDATION -> AiValidationStatus.PENDING_ADMIN_VALIDATION;
            case REJECTED -> AiValidationStatus.REJECTED;
        };
    }
}
