package com.workify.eventservice.Dto;

import com.workify.eventservice.entites.EventCategory;
import com.workify.eventservice.entites.EventStatus;
import lombok.Data;
import java.time.LocalDateTime;

@Data
public class EventDto {
  private Long id;
  private String title;
  private String description;
  private LocalDateTime eventDate;
  private String location;
  private Double latitude;
  private Double longitude;
  private Integer capacity;
  private EventCategory category;
  private String topic;
  private EventStatus status;
  private String createdBy;
  private LocalDateTime createdAt;
  private int totalRegistrations;
  private int totalPartners;
}
