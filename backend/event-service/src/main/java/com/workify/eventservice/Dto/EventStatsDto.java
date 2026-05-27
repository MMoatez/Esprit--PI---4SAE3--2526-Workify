package com.workify.eventservice.Dto;

import com.workify.eventservice.entites.EventStatus;
import lombok.Data;

@Data
public class EventStatsDto {
  private Long eventId;
  private String eventTitle;
  private EventStatus status;
  private long totalRegistrations;
  private long totalPartners;
  private long acceptedPartners;
  private long totalContents;
  private Integer capacity;
  private long availableSpots;
}
