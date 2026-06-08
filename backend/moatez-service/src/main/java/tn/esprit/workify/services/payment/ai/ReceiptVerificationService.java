package tn.esprit.workify.services.payment.ai;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import tn.esprit.workify.DTO.payment.ReceiptAiValidationResponseDto;
import tn.esprit.workify.DTO.payment.ReceiptDecisionResult;
import tn.esprit.workify.DTO.payment.ReceiptDecisionStatus;

import java.io.IOException;
import java.math.BigDecimal;
import java.nio.file.Path;
import java.util.LinkedHashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class ReceiptVerificationService {

    private final AiReceiptClient aiReceiptClient;
    private final ObjectMapper objectMapper;

    public ReceiptDecisionResult verifyUploadedReceipt(MultipartFile file,
                                                       BigDecimal expectedAmount,
                                                       String expectedBankName) {
        try {
            Path tmpFile = java.nio.file.Files.createTempFile("receipt-verification-", "-" + file.getOriginalFilename());
            file.transferTo(tmpFile);
            try {
                return verifyReceiptPath(tmpFile, file.getOriginalFilename(), expectedAmount, expectedBankName);
            } finally {
                java.nio.file.Files.deleteIfExists(tmpFile);
            }
        } catch (IOException ex) {
            throw new IllegalStateException("Unable to process uploaded receipt file", ex);
        }
    }

    public ReceiptDecisionResult verifyReceiptPath(Path path,
                                                   String filename,
                                                   BigDecimal expectedAmount,
                                                   String expectedBankName) {
        log.debug("Verifying receipt with AI: path={}, filename={}, expectedAmount={}, expectedBank={}",
                path, filename, expectedAmount, expectedBankName);
        Resource resource = new FileSystemResource(path.toFile());
        ReceiptAiValidationResponseDto aiResult = aiReceiptClient.verifyReceipt(resource, filename, expectedAmount, expectedBankName);
        log.debug("AI DTO received: status={}, confidence={}",
                aiResult != null ? aiResult.getStatus() : null,
                aiResult != null ? aiResult.getConfidence() : null);
        return applyDecision(aiResult);
    }

    public ReceiptDecisionResult applyDecision(ReceiptAiValidationResponseDto aiResult) {
        if (aiResult == null) {
            log.error("AI verification returned null response; cannot apply decision.");
            throw new IllegalStateException("AI verification returned null response");
        }

        double confidence = normalizeConfidence(aiResult.getConfidence());
        String metadataJson = toMetadataJson(aiResult);

        log.debug("Applying AI decision with confidence={} and status={}", confidence, aiResult.getStatus());

        ReceiptDecisionStatus decision;
        String message;

        if (confidence > 80d) {
            decision = ReceiptDecisionStatus.APPROVED;
            message = "Receipt validated automatically.";
        } else if (confidence >= 50d) {
            decision = ReceiptDecisionStatus.PENDING_ADMIN_VALIDATION;
            message = "Receipt needs manual admin validation.";
        } else {
            decision = ReceiptDecisionStatus.REJECTED;
            message = "The uploaded receipt appears invalid or fake. Please upload a valid document.";
        }

        return ReceiptDecisionResult.builder()
                .decision(decision)
                .confidence(confidence)
                .modelStatus(aiResult.getStatus())
                .extractedData(aiResult.getExtractedData())
                .message(message)
                .reasons(aiResult.getReasons())
                .extractedMetadataJson(metadataJson)
                .build();
    }

    private double normalizeConfidence(Number confidence) {
        if (confidence == null) {
            log.error("AI response confidence is null");
            return 50d;
        }
        double numericConfidence = confidence.doubleValue();
        return Math.max(0d, Math.min(100d, numericConfidence));
    }

    private String toMetadataJson(ReceiptAiValidationResponseDto aiResult) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("status", aiResult.getStatus());
        payload.put("confidence", normalizeConfidence(aiResult.getConfidence()));
        payload.put("extracted_data", aiResult.getExtractedData());
        payload.put("reasons", aiResult.getReasons());

        try {
            return objectMapper.writeValueAsString(payload);
        } catch (JsonProcessingException e) {
            log.warn("Failed to serialize extracted metadata", e);
            return "{}";
        }
    }
}
