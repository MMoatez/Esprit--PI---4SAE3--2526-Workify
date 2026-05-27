package com.workify.userservice.web;

import com.workify.userservice.domain.User;
import com.workify.userservice.repository.UserRepository;
import com.workify.userservice.service.KeycloakAdminService;
import com.workify.userservice.web.dto.LoginRequest;
import com.workify.userservice.service.ForgotPasswordService;
import com.workify.userservice.service.RecaptchaService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping({ "/api/auth", "/auth" })
@Slf4j
@RequiredArgsConstructor
public class AuthController {

    private final RestTemplate restTemplate;
    private final ForgotPasswordService forgotPasswordService;
    private final RecaptchaService recaptchaService;

  @Value("${keycloak.auth-server-url}")
  private String serverUrl;

  @Value("${keycloak.realm}")
  private String realm;

  @Value("${keycloak.client-id:workify-frontend}")
  private String clientId;

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        // 0. Verify reCAPTCHA
        if (!recaptchaService.verifyToken(request.getRecaptchaToken(), "login")) {
            return ResponseEntity.badRequest().body(Map.of("error", "reCAPTCHA verification failed"));
        }

        String url = String.format("%s/realms/%s/protocol/openid-connect/token", serverUrl, realm);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

        MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
        body.add("grant_type", "password");
        body.add("client_id", clientId);
        body.add("username", request.getEmail());
        body.add("password", request.getPassword());
        body.add("scope", "openid profile email");

        HttpEntity<MultiValueMap<String, String>> entity = new HttpEntity<>(body, headers);

        try {
            log.info("Attempting login for user: {} using client: {}", request.getEmail(), clientId);
            ResponseEntity<Map> response = restTemplate.postForEntity(url, entity, Map.class);

            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                Map<String, Object> respBody = response.getBody();
                log.info("Login successful for user: {}", request.getEmail());
                return ResponseEntity.ok(Map.of(
                        "access_token", respBody.get("access_token"),
                        "refresh_token", respBody.get("refresh_token"),
                        "expires_in", respBody.get("expires_in")));
            }
            return ResponseEntity.status(response.getStatusCode()).body(response.getBody());
        } catch (Exception e) {
            log.error("Login failed for user: {}", request.getEmail(), e.getMessage());
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Invalid credentials or server error"));
        }
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@RequestBody Map<String, String> request) {
        String email = request.get("email");
        if (email == null || email.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Email is required"));
        }
        forgotPasswordService.initiateReset(email);
        return ResponseEntity
                .ok(Map.of("message", "If an account exists with this email, a reset link has been sent."));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@RequestBody Map<String, String> request) {
        String token = request.get("token");
        String password = request.get("password");

        if (token == null || password == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Token and password are required"));
        }

        try {
            forgotPasswordService.resetPassword(token, password);
            return ResponseEntity.ok(Map.of("message", "Password has been reset successfully."));
        } catch (Exception e) {
            log.error("Password reset failed", e);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/validate-token")
    public ResponseEntity<?> validateToken(@RequestParam String token) {
        try {
            String email = forgotPasswordService.getEmailByToken(token);
            return ResponseEntity.ok(Map.of("email", email));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", e.getMessage()));
        }
    }
}
