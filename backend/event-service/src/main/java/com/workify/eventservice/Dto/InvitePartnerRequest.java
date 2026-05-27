package com.workify.eventservice.Dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class InvitePartnerRequest {

  @NotBlank(message = "Partner ID is required")
  private String partnerId;

  @NotBlank(message = "Partner email is required")
  @Email(message = "Invalid email")
  private String partnerEmail;

  @NotBlank(message = "Partner name is required")
  private String partnerName;
}
