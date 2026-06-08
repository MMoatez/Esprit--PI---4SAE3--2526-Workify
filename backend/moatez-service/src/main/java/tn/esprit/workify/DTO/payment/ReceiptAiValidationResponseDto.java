package tn.esprit.workify.DTO.payment;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class ReceiptAiValidationResponseDto {
    private Number confidence;
    private String status;

    @JsonProperty("extracted_data")
    private ReceiptAiExtractedDataDto extractedData;

    private List<String> reasons = new ArrayList<>();
}
