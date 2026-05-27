package com.workify.formationservice.web.dto;

import com.workify.formationservice.domain.Domain;
import com.workify.formationservice.domain.Status;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FormationRequest {

    @NotBlank(message = "Title is required")
    private String title;

    private String description;

    @NotNull(message = "Field (Domain) is required")
    private Domain field;

    private Integer level;

    @NotNull(message = "Status (Online/On-site) is required")
    private Status status;

    private Long idPackFk;

    private String period;

    private String googleMeetLink;

    private String address;
}
