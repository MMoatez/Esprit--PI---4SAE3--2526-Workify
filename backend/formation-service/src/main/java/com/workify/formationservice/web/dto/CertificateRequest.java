package com.workify.formationservice.web.dto;

import jakarta.validation.constraints.NotNull;
import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CertificateRequest {

    @NotNull(message = "User ID is required")
    private String userId;

    @NotNull(message = "Formation ID is required")
    private Long formationId;
}
