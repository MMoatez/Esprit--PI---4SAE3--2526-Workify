package com.workify.eventservice.Dto;

import com.workify.eventservice.entites.PartnerStatus;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class PartnerResponseRequest {

  @NotNull(message = "Response is required")
  private PartnerStatus response; // ACCEPTED or REFUSED
}
