package com.workify.userservice.web;

import com.workify.userservice.service.UserProfileService;
import com.workify.userservice.web.dto.*;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserProfileController {

  private final UserProfileService userProfileService;

  @GetMapping("/me")
  public ResponseEntity<UserProfileDto> getMe(Authentication auth) {
    return ResponseEntity.ok(userProfileService.getOrCreateProfile(auth));
  }

  @PutMapping("/me")
  public ResponseEntity<UserProfileDto> updateMe(
    Authentication auth,
    @Valid @RequestBody UpdateProfileRequest request) {
    return ResponseEntity.ok(userProfileService.updateProfile(auth, request));
  }

  @PostMapping(value = "/me/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  public ResponseEntity<UserProfileDto> uploadAvatar(
    Authentication auth,
    @RequestParam("file") MultipartFile file) {
    return ResponseEntity.ok(userProfileService.uploadProfilePicture(auth, file));
  }

  @GetMapping("/me/avatar/{filename}")
  public ResponseEntity<byte[]> getAvatar(@PathVariable String filename) throws IOException {
    byte[] content = userProfileService.getProfilePictureContent(filename);
    if (content == null) {
      return ResponseEntity.notFound().build();
    }
    return ResponseEntity.ok()
      .contentType(MediaType.IMAGE_JPEG)
      .header(HttpHeaders.CACHE_CONTROL, "max-age=3600")
      .body(content);
  }

  @GetMapping("/me/competences")
  public ResponseEntity<UserProfileDto> getMeWithCompetences(Authentication auth) {
    return ResponseEntity.ok(userProfileService.getOrCreateProfile(auth));
  }

  @PostMapping("/me/competences")
  public ResponseEntity<CompetenceDto> addCompetence(
    Authentication auth,
    @Valid @RequestBody AddCompetenceRequest request) {
    return ResponseEntity.ok(userProfileService.addCompetence(auth, request));
  }

  @DeleteMapping("/me/competences/{competenceId}")
  public ResponseEntity<Void> removeCompetence(
    Authentication auth,
    @PathVariable Long competenceId) {
    userProfileService.removeCompetence(auth, competenceId);
    return ResponseEntity.noContent().build();
  }

  @PostMapping("/me/import-cv")
  public ResponseEntity<UserProfileDto> importCv(
    Authentication auth,
    @RequestBody ImportCvRequest request) {
    return ResponseEntity.ok(userProfileService.importCv(auth, request));
  }

  @PostMapping(value = "/me/cv-pdf", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  public ResponseEntity<UserProfileDto> uploadCvPdf(
    Authentication auth,
    @RequestParam("file") MultipartFile file) {
    return ResponseEntity.ok(userProfileService.uploadCvPdf(auth, file));
  }

  @GetMapping("/cv-pdf/{filename}")
  public ResponseEntity<byte[]> getCvPdf(@PathVariable String filename) throws IOException {
    byte[] content = userProfileService.getCvPdfContent(filename);
    if (content == null) {
      return ResponseEntity.notFound().build();
    }
    return ResponseEntity.ok()
      .contentType(MediaType.APPLICATION_PDF)
      .header(HttpHeaders.CACHE_CONTROL, "max-age=3600")
      .body(content);
  }
}
