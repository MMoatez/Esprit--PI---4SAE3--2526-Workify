package com.workify.eventservice.Dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class UserDto {
  private Long id;
  private String keycloakId;
  private String email;
  private String firstName;
  private String lastName;
  private String role;
  private String companyName;

  public String getFullName() {
    return firstName + " " + lastName;
  }
}
