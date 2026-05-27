package com.workify.formationservice.web.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LessonRequest {
    @NotBlank(message = "Title is required")
    private String title;

    private String content;

    private String videoUrl;

    private Integer position;

    @NotNull(message = "Chapter ID is required")
    private Long chapterId;
}
