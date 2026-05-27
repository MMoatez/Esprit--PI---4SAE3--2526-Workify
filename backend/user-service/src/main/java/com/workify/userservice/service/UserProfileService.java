package com.workify.userservice.service;

import com.workify.userservice.domain.AccountStatus;
import com.workify.userservice.domain.Competence;
import com.workify.userservice.domain.Education;
import com.workify.userservice.domain.Experience;
import com.workify.userservice.domain.Role;
import com.workify.userservice.domain.User;
import com.workify.userservice.config.UploadConfig;
import com.workify.userservice.repository.UserRepository;
import com.workify.userservice.security.KeycloakPrincipal;
import com.workify.userservice.web.dto.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserProfileService {

  private final UserRepository userRepository;
  private final UploadConfig uploadConfig;

  @Transactional(readOnly = true)
  public UserProfileDto getOrCreateProfile(Authentication auth) {
    String keycloakId = KeycloakPrincipal.getKeycloakId(auth);
    String email = KeycloakPrincipal.getEmail(auth);
    String finalEmail = (email == null || email.isBlank())
      ? KeycloakPrincipal.getPreferredUsername(auth)
      : email;
    if (keycloakId == null || keycloakId.isBlank()) {
      throw new IllegalStateException("No Keycloak subject in token");
    }

    return userRepository.findByKeycloakId(keycloakId)
      .map(this::toDto)
      .orElseGet(() -> createUserFromKeycloak(keycloakId, finalEmail, auth));
  }

  @Transactional
  public UserProfileDto createUserFromKeycloak(String keycloakId, String email, Authentication auth) {
    Role role = mapRoleFromKeycloak(KeycloakPrincipal.getRealmRoles(auth));
    User user = User.builder()
      .keycloakId(keycloakId)
      .email(email != null ? email : keycloakId)
      .firstName(KeycloakPrincipal.getFirstName(auth))
      .lastName(KeycloakPrincipal.getLastName(auth))
      .role(role)
      .accountStatus(AccountStatus.ACTIVE)
      .build();
    user = userRepository.save(user);
    log.info("Created user profile for keycloakId={}", keycloakId);
    return toDto(user);
  }

  @Transactional
  public UserProfileDto updateProfile(Authentication auth, UpdateProfileRequest request) {
    User user = getCurrentUser(auth);
    if (request.getFirstName() != null)
      user.setFirstName(request.getFirstName());
    if (request.getLastName() != null)
      user.setLastName(request.getLastName());
    if (request.getPhone() != null)
      user.setPhone(request.getPhone());
    if (request.getRib() != null)
      user.setRib(request.getRib());
    if (request.getTitle() != null)
      user.setTitle(request.getTitle());
    if (request.getBio() != null)
      user.setBio(request.getBio());
    if (request.getHourlyRate() != null)
      user.setHourlyRate(request.getHourlyRate());
    if (request.getLocation() != null)
      user.setLocation(request.getLocation());
    if (request.getCompanyName() != null)
      user.setCompanyName(request.getCompanyName());
    if (request.getIndustry() != null)
      user.setIndustry(request.getIndustry());
    if (request.getWebsite() != null)
      user.setWebsite(request.getWebsite());
    user.setUpdatedAt(java.time.Instant.now());
    user = userRepository.save(user);
    return toDto(user);
  }

  @Transactional
  public UserProfileDto uploadProfilePicture(Authentication auth, MultipartFile file) {
    User user = getCurrentUser(auth);
    saveAvatar(user, file);
    return toDto(user);
  }

  @Transactional
  public void saveAvatar(User user, MultipartFile file) {
    if (file == null || file.isEmpty()) {
      return;
    }
    String contentType = file.getContentType();
    if (contentType == null || !contentType.startsWith("image/")) {
      throw new IllegalArgumentException("Only images are allowed");
    }

    String originalFilename = file.getOriginalFilename();
    String ext = originalFilename != null && originalFilename.contains(".")
      ? originalFilename.substring(originalFilename.lastIndexOf('.'))
      : ".jpg";
    String filename = user.getId() + "_" + UUID.randomUUID() + ext;
    Path dir = Path.of(uploadConfig.getProfileDir());
    try {
      if (!Files.exists(dir)) {
        Files.createDirectories(dir);
      }
      Path target = dir.resolve(filename);
      Files.copy(file.getInputStream(), target);
    } catch (IOException e) {
      throw new RuntimeException("Failed to save profile picture", e);
    }

    String previous = user.getProfilePicture();
    if (previous != null) {
      Path oldPath = dir.resolve(Path.of(previous).getFileName().toString());
      try {
        Files.deleteIfExists(oldPath);
      } catch (IOException ignored) {
      }
    }
    user.setProfilePicture("/api/users/me/avatar/" + filename);
    user.setUpdatedAt(java.time.Instant.now());
    userRepository.save(user);
  }

  @Transactional(readOnly = true)
  public byte[] getProfilePictureContent(String filename) throws IOException {
    Path path = Path.of(uploadConfig.getProfileDir()).resolve(filename);
    if (!Files.exists(path)) {
      return null;
    }
    return Files.readAllBytes(path);
  }

  @Transactional
  public CompetenceDto addCompetence(Authentication auth, AddCompetenceRequest request) {
    User user = getCurrentUser(auth);
    Competence c = Competence.builder().name(request.getName().trim()).build();
    user.addCompetence(c);
    user.setUpdatedAt(java.time.Instant.now());
    userRepository.save(user);
    return new CompetenceDto(c.getId(), c.getName());
  }

  @Transactional
  public void removeCompetence(Authentication auth, Long competenceId) {
    User user = getCurrentUser(auth);
    Competence toRemove = user.getCompetences().stream()
      .filter(c -> c.getId().equals(competenceId))
      .findFirst()
      .orElseThrow(() -> new IllegalArgumentException("Competence not found"));
    user.removeCompetence(toRemove);
    user.setUpdatedAt(java.time.Instant.now());
    userRepository.save(user);
  }

  @Transactional
  public UserProfileDto importCv(Authentication auth, ImportCvRequest request) {
    User user = getCurrentUser(auth);

    // 1. Map Profile (Basics)
    if (request.getProfile() != null) {
      ImportCvRequest.Profile profile = request.getProfile();
      if (profile.getName() != null && !profile.getName().isBlank()) {
        String[] parts = profile.getName().split(" ", 2);
        user.setFirstName(parts[0]);
        if (parts.length > 1)
          user.setLastName(parts[1]);
      }
      if (profile.getSummary() != null)
        user.setBio(profile.getSummary());
      if (profile.getLocation() != null)
        user.setLocation(profile.getLocation());
      if (profile.getPhone() != null)
        user.setPhone(profile.getPhone());
    }

    // 2. Map Skills into Competences
    if (request.getSkills() != null && request.getSkills().getFeaturedSkills() != null) {
      request.getSkills().getFeaturedSkills().forEach(skillItem -> {
        if (skillItem.getSkill() != null && !skillItem.getSkill().isBlank()) {
          boolean exists = user.getCompetences().stream()
            .anyMatch(c -> c.getName().equalsIgnoreCase(skillItem.getSkill().trim()));
          if (!exists) {
            user.addCompetence(Competence.builder().name(skillItem.getSkill().trim()).build());
          }
        }
      });
    }

    // 3. Map Education
    if (request.getEducations() != null) {
      user.getEducations().clear();
      request.getEducations().forEach(eduItem -> {
        if (eduItem.getSchool() != null && !eduItem.getSchool().isBlank()) {
          String desc = eduItem.getDescriptions() != null ? String.join("\n", eduItem.getDescriptions())
            : null;
          Education e = Education.builder()
            .institution(eduItem.getSchool().trim())
            .degree(eduItem.getDegree() != null ? eduItem.getDegree().trim() : "Degree")
            .description(desc)
            .startDate(eduItem.getDate())
            .endDate(null)
            .build();
          user.addEducation(e);
        }
      });
    }

    // 4. Map Experience (Work)
    if (request.getWorkExperiences() != null) {
      user.getExperiences().clear();
      request.getWorkExperiences().forEach(expItem -> {
        if (expItem.getCompany() != null && !expItem.getCompany().isBlank()) {
          String desc = expItem.getDescriptions() != null ? String.join("\n", expItem.getDescriptions())
            : null;
          Experience e = Experience.builder()
            .company(expItem.getCompany().trim())
            .position(expItem.getJobTitle() != null ? expItem.getJobTitle().trim() : "Employee")
            .description(desc)
            .startDate(expItem.getDate())
            .endDate(null)
            .build();
          user.addExperience(e);
        }
      });
    }

    user.setUpdatedAt(java.time.Instant.now());
    userRepository.save(user);
    return toDto(user);
  }

  @Transactional
  public UserProfileDto uploadCvPdf(Authentication auth, MultipartFile file) {
    User user = getCurrentUser(auth);
    if (file == null || file.isEmpty()) {
      throw new IllegalArgumentException("PDF file is required");
    }
    String contentType = file.getContentType();
    if (contentType == null || !contentType.equals("application/pdf")) {
      throw new IllegalArgumentException("Only PDF files are allowed");
    }

    String filename = user.getId() + "_cv_" + UUID.randomUUID() + ".pdf";
    Path dir = Path.of(uploadConfig.getProfileDir()).getParent().resolve("cvs");
    try {
      if (!Files.exists(dir)) {
        Files.createDirectories(dir);
      }
      Path target = dir.resolve(filename);
      Files.copy(file.getInputStream(), target);
    } catch (IOException e) {
      throw new RuntimeException("Failed to save CV PDF", e);
    }

    String previous = user.getCvPdf();
    if (previous != null) {
      String oldFilename = previous.substring(previous.lastIndexOf('/') + 1);
      Path oldPath = dir.resolve(oldFilename);
      try {
        Files.deleteIfExists(oldPath);
      } catch (IOException ignored) {
      }
    }
    user.setCvPdf("/api/users/cv-pdf/" + filename);
    user.setUpdatedAt(java.time.Instant.now());
    userRepository.save(user);
    return toDto(user);
  }

  @Transactional(readOnly = true)
  public byte[] getCvPdfContent(String filename) throws IOException {
    Path path = Path.of(uploadConfig.getProfileDir()).getParent().resolve("cvs").resolve(filename);
    if (!Files.exists(path)) {
      return null;
    }
    return Files.readAllBytes(path);
  }

  private User getCurrentUser(Authentication auth) {
    String keycloakId = KeycloakPrincipal.getKeycloakId(auth);
    return userRepository.findByKeycloakId(keycloakId)
      .orElseThrow(() -> new IllegalStateException("User profile not found"));
  }

  @Transactional(readOnly = true)
  public List<UserProfileDto> getAllFreelancers() {
    return userRepository.findAllByRole(Role.FREELANCER).stream()
      .map(this::toDto)
      .toList();
  }

  @Transactional(readOnly = true)
  public UserProfileDto getFreelancerById(Long id) {
    User user = userRepository.findById(id)
      .orElseThrow(() -> new RuntimeException("Freelancer not found"));
    if (user.getRole() != Role.FREELANCER) {
      throw new RuntimeException("User is not a freelancer");
    }
    return toDto(user);
  }

  @Transactional(readOnly = true)
  public List<UserProfileDto> getAllClients() {
    return userRepository.findAllByRole(Role.CLIENT).stream()
      .map(this::toDto)
      .toList();
  }

  /** Returns any user by numeric DB id regardless of role (used for public name resolution). */
  @Transactional(readOnly = true)
  public UserProfileDto getUserById(Long id) {
    User user = userRepository.findById(id)
      .orElseThrow(() -> new RuntimeException("User not found: " + id));
    return toDto(user);
  }

  public UserProfileDto toDto(User u) {
    List<CompetenceDto> comps = u.getCompetences().stream()
      .map(c -> new CompetenceDto(c.getId(), c.getName()))
      .toList();

    List<EducationDto> edus = u.getEducations().stream()
      .map(e -> EducationDto.builder()
        .id(e.getId())
        .institution(e.getInstitution())
        .degree(e.getDegree())
        .description(e.getDescription())
        .startDate(e.getStartDate())
        .endDate(e.getEndDate())
        .build())
      .toList();

    List<ExperienceDto> exps = u.getExperiences().stream()
      .map(e -> ExperienceDto.builder()
        .id(e.getId())
        .company(e.getCompany())
        .position(e.getPosition())
        .description(e.getDescription())
        .startDate(e.getStartDate())
        .endDate(e.getEndDate())
        .build())
      .toList();

    return UserProfileDto.builder()
      .id(u.getId())
      .keycloakId(u.getKeycloakId())
      .firstName(u.getFirstName())
      .lastName(u.getLastName())
      .email(u.getEmail())
      .phone(u.getPhone())
      .profilePicture(u.getProfilePicture())
      .role(u.getRole())
      .accountStatus(u.getAccountStatus())
      .inscriptionDate(u.getInscriptionDate())
      .updatedAt(u.getUpdatedAt())
      .rib(u.getRib())
      .title(u.getTitle())
      .bio(u.getBio())
      .hourlyRate(u.getHourlyRate())
      .location(u.getLocation())
      .companyName(u.getCompanyName())
      .industry(u.getIndustry())
      .website(u.getWebsite())
      .cvPdf(u.getCvPdf())
      .competences(comps)
      .educations(edus)
      .experiences(exps)
      .build();
  }

  private Role mapRoleFromKeycloak(List<String> realmRoles) {
    if (realmRoles == null)
      return Role.FREELANCER;
    if (realmRoles.contains("admin"))
      return Role.ADMIN;
    if (realmRoles.contains("client"))
      return Role.CLIENT;
    if (realmRoles.contains("service_desk"))
      return Role.SERVICE_DESK;
    if (realmRoles.contains("partner"))
      return Role.PARTNER;
    return Role.FREELANCER;
  }
}
