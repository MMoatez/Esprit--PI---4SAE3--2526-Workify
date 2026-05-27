package com.workify.eventservice.Dto;

import com.workify.eventservice.entites.ContentType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class AddContentRequest {

  @NotNull(message = "Content type is required")
  private ContentType type;

  @NotBlank(message = "Title is required")
  private String title;

  private String description;

  private String resourceUrl;
}
