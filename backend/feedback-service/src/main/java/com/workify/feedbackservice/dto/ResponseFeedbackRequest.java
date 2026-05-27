package com.workify.feedbackservice.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.List;

@Data
public class ResponseFeedbackRequest {

    @NotBlank @Size(min = 10, max = 1000)
    private String content;

    /** ID du freelancer (envoyé par le frontend) */
    @NotNull
    private Long freelancerId;

    /** URLs of uploaded attachments (optional) */
    private List<String> attachments;
}
