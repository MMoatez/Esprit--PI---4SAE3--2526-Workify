package com.workify.eventservice.Dto;

import com.workify.eventservice.entites.UserType;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class RegisterEventRequest {

  @NotNull(message = "User type is required")
  private UserType userType;
  private String userEmail;
  private String userName;
}
