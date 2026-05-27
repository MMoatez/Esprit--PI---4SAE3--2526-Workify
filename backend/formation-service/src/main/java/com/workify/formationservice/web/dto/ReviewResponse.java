package com.workify.formationservice.web.dto;

import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Builder
public class ReviewResponse {
    private Long id;
    private Integer rating;
    private String comment;
    private String userId;
    private Long formationId;
    private LocalDateTime createdAt;
}
