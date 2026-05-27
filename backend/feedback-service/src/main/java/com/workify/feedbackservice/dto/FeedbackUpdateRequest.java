package com.workify.feedbackservice.dto;

import jakarta.validation.constraints.*;
import lombok.Data;

import java.util.List;

@Data
public class FeedbackUpdateRequest {

    @NotNull @Min(1) @Max(5)
    private Integer ratingGlobal;

    @NotNull @Min(1) @Max(5)
    private Integer ratingCommunication;

    @NotNull @Min(1) @Max(5)
    private Integer ratingQuality;

    @NotNull @Min(1) @Max(5)
    private Integer ratingDeadline;

    @NotNull @Min(1) @Max(5)
    private Integer ratingProfessionalism;

    @NotBlank @Size(min = 20, max = 2000)
    private String comment;

    @NotNull
    private Boolean recommend;

    /** URLs of uploaded attachments (optional) */
    private List<String> attachments;
}
