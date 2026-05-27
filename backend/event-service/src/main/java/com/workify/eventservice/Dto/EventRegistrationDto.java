package com.workify.eventservice.Dto;

import com.workify.eventservice.entites.RegistrationStatus;
import com.workify.eventservice.entites.UserType;
import lombok.Data;
import java.time.LocalDateTime;

@Data
public class EventRegistrationDto {
  private Long id;
  private String userId;
  private String userEmail;
  private String userName;
  private UserType userType;
  private RegistrationStatus status;
  private LocalDateTime registeredAt;
  private LocalDateTime checkedInAt;
  private String qrToken;
  private Long eventId;
  private String eventTitle;
  private String eventDate;
  private String eventLocation;
}
