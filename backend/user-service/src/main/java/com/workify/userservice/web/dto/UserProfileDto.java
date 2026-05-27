package com.workify.userservice.web.dto;

import com.workify.userservice.domain.AccountStatus;
import com.workify.userservice.domain.Role;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserProfileDto {
    private Long id;
    private String keycloakId;
    private String firstName;
    private String lastName;
    private String email;
    private String phone;
    private String profilePicture;
    private Role role;
    private AccountStatus accountStatus;
    private Instant inscriptionDate;
    private Instant updatedAt;
    private String rib;
    private String title;
    private String bio;
    private Double hourlyRate;
    private String location;
    private String companyName;
    private String industry;
    private String website;
    private String cvPdf;
    @Builder.Default
    private List<CompetenceDto> competences = List.of();

    @Builder.Default
    private List<EducationDto> educations = List.of();

    @Builder.Default
    private List<ExperienceDto> experiences = List.of();
}
