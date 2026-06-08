package tn.esprit.workify.DTO.payment;

import lombok.Builder;
import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Data
@Builder
public class ReceiptDecisionResult {
    private ReceiptDecisionStatus decision;
    private double confidence;
    private String modelStatus;
    private String extractedMetadataJson;
    private ReceiptAiExtractedDataDto extractedData;
    private String message;

    @Builder.Default
    private List<String> reasons = new ArrayList<>();

    public static ReceiptDecisionResult pendingFallback(String message) {
        return ReceiptDecisionResult.builder()
                .decision(ReceiptDecisionStatus.PENDING_ADMIN_VALIDATION)
                .confidence(50d)
                .modelStatus("UNAVAILABLE")
                .message(message)
                .build();
    }
}
