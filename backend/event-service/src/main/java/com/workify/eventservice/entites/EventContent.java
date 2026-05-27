package com.workify.eventservice.entites;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "event_contents")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class EventContent {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "event_id", nullable = false)
  private Event event;

  @Column(nullable = false)
  private String partnerId;

  @Column(nullable = false)
  private String partnerName;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private ContentType type;

  @Column(nullable = false)
  private String title;

  @Column(columnDefinition = "TEXT")
  private String description;

  private String resourceUrl;

  private LocalDateTime addedAt;

  @PrePersist
  public void prePersist() {
    addedAt = LocalDateTime.now();
  }
}
