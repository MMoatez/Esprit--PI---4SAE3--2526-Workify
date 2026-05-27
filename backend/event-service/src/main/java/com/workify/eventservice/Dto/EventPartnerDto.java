package com.workify.eventservice.Dto;

import com.workify.eventservice.entites.PartnerStatus;
import lombok.Data;
import java.time.LocalDateTime;

@Data
public class EventPartnerDto {
  private Long id;
  private String partnerId;
  private String partnerEmail;
  private String partnerName;
  private PartnerStatus status;
  private LocalDateTime invitedAt;
  private LocalDateTime respondedAt;

  // Renvoyé uniquement au partenaire concerné (pour répondre à l'invitation)
  private String invitationToken;

  // Détails de l'événement (pour la vue partenaire)
  private Long eventId;
  private String eventTitle;
  private LocalDateTime eventDate;
  private String eventLocation;
  private String eventCategory;
  private String eventDescription;
}
