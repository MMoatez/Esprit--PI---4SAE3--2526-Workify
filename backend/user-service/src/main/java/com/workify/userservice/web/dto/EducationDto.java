package com.workify.userservice.web.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EducationDto {
    private Long id;
    private String institution;
    private String degree;
    private String description;
    private String startDate;
    private String endDate;
}
