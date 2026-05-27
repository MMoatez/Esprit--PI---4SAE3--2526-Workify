package com.workify.feedbackservice.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

/** Envoyé par project-service lors de l'acceptation d'une offre */
@Data
public class TriggerEvaluationRequest {

    @NotNull
    private Long offerId;

    @NotBlank
    private String clientEmail;

    @NotNull
    private Long freelancerId;

    private String projectTitle;
}
