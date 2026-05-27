package com.workify.userservice.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "users", indexes = @Index(unique = true, columnList = "keycloak_id"))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "keycloak_id", nullable = false, unique = true)
  private String keycloakId;

  @Column(name = "first_name")
  private String firstName;

  @Column(name = "last_name")
  private String lastName;

  @Column(nullable = false)
  private String email;

  @Column(name = "phone")
  private String phone;

  @Column(name = "profile_picture")
  private String profilePicture;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  @Builder.Default
  private Role role = Role.FREELANCER;

  @Enumerated(EnumType.STRING)
  @Column(name = "account_status", nullable = false)
  @Builder.Default
  private AccountStatus accountStatus = AccountStatus.ACTIVE;

  @Column(name = "inscription_date", nullable = false, updatable = false)
  @Builder.Default
  private Instant inscriptionDate = Instant.now();

  @Column(name = "updated_at")
  @Builder.Default
  private Instant updatedAt = Instant.now();

  @Column(name = "rib")
  private String rib;

  @Column(name = "title")
  private String title;

  @Column(name = "bio", length = 2000)
  private String bio;

  @Column(name = "hourly_rate")
  private Double hourlyRate;

  @Column(name = "location")
  private String location;

  @Column(name = "company_name")
  private String companyName;

  @Column(name = "industry")
  private String industry;

  @Column(name = "website")
  private String website;

  @Column(name = "cv_pdf")
  private String cvPdf;

  @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, orphanRemoval = true)
  @Builder.Default
  private List<Competence> competences = new ArrayList<>();

  public void addCompetence(Competence c) {
    competences.add(c);
    c.setUser(this);
  }

  public void removeCompetence(Competence c) {
    competences.remove(c);
    c.setUser(null);
  }

  @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
  @Builder.Default
  private List<Education> educations = new ArrayList<>();

  public void addEducation(Education e) {
    educations.add(e);
    e.setUser(this);
  }

  public void removeEducation(Education e) {
    educations.remove(e);
    e.setUser(null);
  }

  @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
  @Builder.Default
  private List<Experience> experiences = new ArrayList<>();

  public void addExperience(Experience e) {
    experiences.add(e);
    e.setUser(this);
  }

  public void removeExperience(Experience e) {
    experiences.remove(e);
    e.setUser(null);
  }
}
