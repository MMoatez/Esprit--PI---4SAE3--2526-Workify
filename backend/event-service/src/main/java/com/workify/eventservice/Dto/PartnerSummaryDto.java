package com.workify.eventservice.Dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class PartnerSummaryDto {
    private String ref;          // keycloakId (opaque — never labelled as such in the API)
    private String name;
    private String email;
    private String organization;
}
