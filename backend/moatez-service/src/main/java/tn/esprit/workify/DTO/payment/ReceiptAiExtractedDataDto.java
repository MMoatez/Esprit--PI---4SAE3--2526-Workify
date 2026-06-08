package tn.esprit.workify.DTO.payment;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

@Data
public class ReceiptAiExtractedDataDto {
    private String amount;
    private String date;
    private String bank;

    @JsonProperty("transaction_id")
    private String transactionId;
}
