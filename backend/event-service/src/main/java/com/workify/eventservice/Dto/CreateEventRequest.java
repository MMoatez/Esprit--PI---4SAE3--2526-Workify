package com.workify.eventservice.Dto;

import com.workify.eventservice.entites.EventCategory;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.time.LocalDateTime;

@Data
public class CreateEventRequest {

  @NotBlank(message = "Title is required")
  private String title;

  private String description;

  @NotNull(message = "Event date is required")
  private LocalDateTime eventDate;

  @NotBlank(message = "Location is required")
  private String location;

  private Double latitude;
  private Double longitude;

  private Integer capacity;

  private EventCategory category;

  private String topic;
}
