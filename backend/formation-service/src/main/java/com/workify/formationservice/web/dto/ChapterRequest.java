package com.workify.formationservice.web.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChapterRequest {
    @NotBlank(message = "Title is required")
    private String title;

    private Integer position;

    @NotNull(message = "Formation ID is required")
    private Long formationId;
}
