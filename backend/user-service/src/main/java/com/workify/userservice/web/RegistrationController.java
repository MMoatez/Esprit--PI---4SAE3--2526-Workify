package com.workify.userservice.web;

import com.workify.userservice.domain.User;
import com.workify.userservice.domain.Competence;
import com.workify.userservice.service.AiService;
import com.workify.userservice.service.UserProfileService;
import com.workify.userservice.service.KeycloakAdminService;

import com.workify.userservice.repository.UserRepository;
import com.workify.userservice.web.dto.RegistrationRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;
import java.util.HashMap;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;

@RestController
@RequestMapping({ "/api/registration", "/registration" })
@RequiredArgsConstructor
@Slf4j
public class RegistrationController {

  private final AiService aiService;
  private final UserProfileService userProfileService;
  private final KeycloakAdminService keycloakAdminService;
  private final UserRepository userRepository;
  private final RestTemplate restTemplate;

  @Value("${keycloak.auth-server-url}")
  private String keycloakServerUrl;

  @Value("${keycloak.realm}")
  private String keycloakRealm;

  @PostMapping("/extract-competences")
  public ResponseEntity<List<String>> extract(
    @RequestParam("file") MultipartFile file,
    @RequestParam(value = "role", required = false) String role) {
    try {
      List<String> competences = aiService.extractCompetences(file.getBytes(), role);
      return ResponseEntity.ok(competences);
    } catch (java.io.IOException e) {
      log.error("Failed to read file bytes", e);
      return ResponseEntity.internalServerError().build();
    }
  }

  @PostMapping(value = "/submit", consumes = { "multipart/form-data" })
  public ResponseEntity<?> submit(
    @Valid @RequestPart("data") RegistrationRequest request,
    @RequestPart(value = "file", required = false) MultipartFile file) {
    log.info("Registering user: {}", request.getEmail());

    try {
      // Check if local profile already exists
      if (userRepository.findByEmail(request.getEmail()).isPresent()) {
        return ResponseEntity.status(409).body(Map.of("error", "Un utilisateur avec cet email existe déjà."));
      }

      // 1. Create in Keycloak
      String keycloakId = keycloakAdminService.createUser(
        request.getEmail(),
        request.getPassword(),
        request.getFirstName(),
        request.getLastName(),
        request.getRole().name());

      // 2. Create local profile
      User user = User.builder()
        .keycloakId(keycloakId)
        .email(request.getEmail())
        .firstName(request.getFirstName())
        .lastName(request.getLastName())
        .phone(request.getPhone())
        .role(request.getRole())
        .companyName(request.getCompanyName())
        .industry(request.getIndustry())
        .website(request.getWebsite())
        .build();

      if (request.getCompetences() != null) {
        request.getCompetences().forEach(name -> {
          if (name != null && !name.isBlank()) {
            String cleanName = name.trim();
            cleanName = cleanName.length() > 255 ? cleanName.substring(0, 255) : cleanName;
            user.addCompetence(Competence.builder().name(cleanName).build());
          }
        });
      }

      userRepository.save(user);

      // 3. Save avatar if present
      if (file != null && !file.isEmpty()) {
        try {
          userProfileService.saveAvatar(user, file);
        } catch (Exception e) {
          log.error("Failed to save avatar for user {}", request.getEmail(), e);
          // Don't fail registration if avatar fails? Or fail?
          // Let's log but consider registration success.
        }
      }

      // 4. Auto-login to get an access_token so frontend can call APIs immediately
      Map<String, Object> responseMap = new HashMap<>();
      responseMap.put("message", "Compte créé avec succès.");
      responseMap.put("userId", keycloakId);

      try {
        String tokenUrl = String.format("%s/realms/%s/protocol/openid-connect/token", keycloakServerUrl,
          keycloakRealm);
        HttpHeaders tokenHeaders = new HttpHeaders();
        tokenHeaders.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
        MultiValueMap<String, String> tokenBody = new LinkedMultiValueMap<>();
        tokenBody.add("grant_type", "password");
        tokenBody.add("client_id", "workify-frontend");
        tokenBody.add("username", request.getEmail());
        tokenBody.add("password", request.getPassword());
        tokenBody.add("scope", "openid profile email");
        HttpEntity<MultiValueMap<String, String>> tokenEntity = new HttpEntity<>(tokenBody, tokenHeaders);
        ResponseEntity<Map> tokenResponse = restTemplate.postForEntity(tokenUrl, tokenEntity, Map.class);
        if (tokenResponse.getStatusCode() == HttpStatus.OK && tokenResponse.getBody() != null) {
          responseMap.put("access_token", tokenResponse.getBody().get("access_token"));
          responseMap.put("refresh_token", tokenResponse.getBody().get("refresh_token"));
          log.info("Auto-login token obtained for new user: {}", request.getEmail());
        }
      } catch (Exception tokenEx) {
        log.warn("Could not auto-login new user {}: {}", request.getEmail(), tokenEx.getMessage());
        // Registration still succeeded, token is just a bonus
      }

      return ResponseEntity.ok(responseMap);
    } catch (RuntimeException e) {
      String message = e.getMessage();
      if (message != null && message.contains("409")) {
        return ResponseEntity.status(409)
          .body(Map.of("error", "Un utilisateur avec cet email existe déjà dans Keycloak."));
      }
      log.error("Registration failed for user: {}", request.getEmail(), e);
      return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
    } catch (Exception e) {
      log.error("Registration failed for user: {}", request.getEmail(), e);
      return ResponseEntity.status(500).body(Map.of("error", "Une erreur interne est survenue."));
    }
  }

  @GetMapping("/check-email")
  public ResponseEntity<Map<String, Boolean>> checkEmail(@RequestParam("email") String email) {
    boolean exists = userRepository.findByEmail(email).isPresent();
    return ResponseEntity.ok(Map.of("exists", exists));
  }
}
