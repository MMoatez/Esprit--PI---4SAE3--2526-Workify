package com.workify.userservice.web.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class AddCompetenceRequest {
    @NotBlank
    @Size(min = 1, max = 100)
    private String name;
}
