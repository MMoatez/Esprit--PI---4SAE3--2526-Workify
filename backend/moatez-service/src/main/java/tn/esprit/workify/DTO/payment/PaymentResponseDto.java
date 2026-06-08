package tn.esprit.workify.DTO.payment;

import lombok.Builder;
import lombok.Data;
import tn.esprit.workify.entities.payment.PaymentStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
public class PaymentResponseDto {
    private Integer id;
    private Integer userId;
    private String userFullName;
    private String userEmail;
    private String packName;
    private String selectedDuration;
    private BigDecimal amount;
    private String currency;
    private PaymentStatus status;
    private String stripePaymentIntentId;
    private LocalDateTime createdAt;
}
