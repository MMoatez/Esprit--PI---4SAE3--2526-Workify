package tn.esprit.workify.DTO.payment;

import lombok.Data;
import tn.esprit.workify.entities.pack.Dur;

@Data
public class CreateCheckoutSessionRequest {
    private Integer userId;
    private Integer packId;
    private Dur selectedDuration;
    private String successUrl;
    private String cancelUrl;
}
