package tn.esprit.workify.DTO;

import lombok.Data;
import tn.esprit.workify.entities.pack.Dur;
import tn.esprit.workify.entities.subscription.PaymentMethod;

@Data
public class CreateSubscriptionDto {
    private Integer userId;
    private Integer packId;
    private Dur selectedDuration;
    private PaymentMethod paymentMethod;
    private String transactionReference;  // required for bank transfer
    private String receiptPath;           // file path after upload
}
