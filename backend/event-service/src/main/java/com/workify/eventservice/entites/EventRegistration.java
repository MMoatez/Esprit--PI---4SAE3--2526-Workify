package com.workify.eventservice.entites;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(
  name = "event_registrations",
  uniqueConstraints = @UniqueConstraint(columnNames = {"event_id", "userId"})
)
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class EventRegistration {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "event_id", nullable = false)
  private Event event;

  @Column(nullable = false)
  private String userId;

  @Column(nullable = false)
  private String userEmail;

  private String userName;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  @Builder.Default
  private UserType userType = UserType.FREELANCER;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  @Builder.Default
  private RegistrationStatus status = RegistrationStatus.PENDING;

  private LocalDateTime registeredAt;
  private LocalDateTime cancelledAt;

  @Column(unique = true)
  private String qrToken;

  private LocalDateTime checkedInAt;


  // EventRegistration
  @PrePersist
  public void prePersist() {
    registeredAt = LocalDateTime.now();
    if (status == null) status = RegistrationStatus.PENDING;
    if (userType == null) userType = UserType.FREELANCER;
  }
}
