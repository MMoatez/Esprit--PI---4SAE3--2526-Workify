package tn.esprit.workify.DTO.payment;

import lombok.Builder;
import lombok.Data;
import tn.esprit.workify.entities.subscription.AiValidationStatus;

import java.util.ArrayList;
import java.util.List;

@Data
@Builder
public class VerifyReceiptResponseDto {
    private double confidence;
    private AiValidationStatus aiValidationStatus;
    private String modelStatus;
    private String message;
    private ReceiptAiExtractedDataDto extractedData;

    @Builder.Default
    private List<String> reasons = new ArrayList<>();
}
