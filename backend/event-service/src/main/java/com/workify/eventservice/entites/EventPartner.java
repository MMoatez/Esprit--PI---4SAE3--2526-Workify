package com.workify.eventservice.entites;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "event_partners")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class EventPartner {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "event_id", nullable = false)
  private Event event;

  @Column(nullable = false)
  private String partnerId;

  @Column(nullable = false)
  private String partnerEmail;

  private String partnerName;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private PartnerStatus status;

  private String invitationToken;

  private LocalDateTime invitedAt;
  private LocalDateTime respondedAt;

  @PrePersist
  public void prePersist() {
    invitedAt = LocalDateTime.now();
    if (status == null) status = PartnerStatus.PENDING;
  }
}
