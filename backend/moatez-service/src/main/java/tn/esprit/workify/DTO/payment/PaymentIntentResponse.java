package tn.esprit.workify.DTO.payment;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class PaymentIntentResponse {
    private Integer paymentId;
    private String paymentIntentId;
    private String clientSecret;
    private Long amount;
    private String currency;
}
