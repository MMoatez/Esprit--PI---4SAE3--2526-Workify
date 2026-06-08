package tn.esprit.workify.DTO;

import lombok.Builder;
import lombok.Data;
import tn.esprit.workify.entities.subscription.AiValidationStatus;
import tn.esprit.workify.entities.subscription.PaymentMethod;
import tn.esprit.workify.entities.subscription.StatutsSubscription;

import java.time.LocalDateTime;

@Data
@Builder
public class SubscriptionResponseDto {
    private Integer id;
    private Integer userId;
    private String userFullName;
    private String userEmail;
    private Integer packId;
    private String packName;
    private Float packPrice;
    private String packDuration;
    private LocalDateTime startDate;
    private LocalDateTime endDate;
    private StatutsSubscription statuts;
    private Float amountPaid;
    private PaymentMethod paymentMethod;
    private String transactionReference;
    private String receiptPath;
    private String rejectionReason;
    private Double receiptConfidence;
    private AiValidationStatus aiValidationStatus;
    private String extractedMetadata;
    private String aiRejectionReason;
    private Boolean adminOverride;
    private LocalDateTime createdAt;
}
