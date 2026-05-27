package com.workify.eventservice.entites;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "events")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Event {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(nullable = false)
  private String title;

  @Column(columnDefinition = "TEXT")
  private String description;

  @Column(nullable = false)
  private LocalDateTime eventDate;

  @Column(nullable = false)
  private String location;

  private Double latitude;
  private Double longitude;

  private Integer capacity;

  @Enumerated(EnumType.STRING)
  private EventCategory category;

  @Column(length = 500)
  private String topic;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private EventStatus status;

  @Column(nullable = false)
  private String createdBy;

  private LocalDateTime createdAt;
  private LocalDateTime updatedAt;

  @OneToMany(mappedBy = "event", cascade = CascadeType.ALL,
    orphanRemoval = true, fetch = FetchType.LAZY)
  private List<EventPartner> partners = new ArrayList<>();

  @OneToMany(mappedBy = "event", cascade = CascadeType.ALL,
    orphanRemoval = true, fetch = FetchType.LAZY)
  private List<EventRegistration> registrations = new ArrayList<>();

  @OneToMany(mappedBy = "event", cascade = CascadeType.ALL,
    orphanRemoval = true, fetch = FetchType.LAZY)
  private List<EventContent> contents = new ArrayList<>();

  @PrePersist
  public void prePersist() {
    createdAt = LocalDateTime.now();
    updatedAt = LocalDateTime.now();
    if (status == null) status = EventStatus.DRAFT;
  }

  @PreUpdate
  public void preUpdate() {
    updatedAt = LocalDateTime.now();
  }
}
