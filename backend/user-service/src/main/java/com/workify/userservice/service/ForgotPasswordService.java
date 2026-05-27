package com.workify.userservice.service;

import com.workify.userservice.domain.PasswordResetToken;
import com.workify.userservice.repository.PasswordResetTokenRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.keycloak.representations.idm.UserRepresentation;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

@Service
@Slf4j
@RequiredArgsConstructor
public class ForgotPasswordService {

    private final PasswordResetTokenRepository tokenRepository;
    private final MailService mailService;
    private final KeycloakAdminService keycloakAdminService;

    @Transactional
    public void initiateReset(String email) {
        Optional<UserRepresentation> userOpt = keycloakAdminService.getUser(email);
        if (userOpt.isEmpty()) {
            log.warn("Password reset requested for non-existent email: {}", email);
            // We return early but don't throw an error to prevent email enumeration
            return;
        }

        // Generate token
        String token = UUID.randomUUID().toString();

        // Clean existing tokens for this email
        tokenRepository.deleteByEmail(email);

        PasswordResetToken resetToken = PasswordResetToken.builder()
                .email(email)
                .token(token)
                .expiryDate(LocalDateTime.now().plusHours(24))
                .build();

        tokenRepository.save(resetToken);

        // Send Email
        mailService.sendResetPasswordEmail(email, token);
    }

    @Transactional
    public void resetPassword(String token, String newPassword) {
        PasswordResetToken resetToken = tokenRepository.findByToken(token)
                .orElseThrow(() -> new RuntimeException("Invalid or expired token"));

        if (resetToken.isExpired()) {
            tokenRepository.delete(resetToken);
            throw new RuntimeException("Token has expired");
        }

        Optional<UserRepresentation> userOpt = keycloakAdminService.getUser(resetToken.getEmail());
        if (userOpt.isEmpty()) {
            throw new RuntimeException("User no longer exists");
        }

        // Update in Keycloak
        keycloakAdminService.resetPassword(userOpt.get().getId(), newPassword);

        // Clean up
        tokenRepository.delete(resetToken);
    }

    public String getEmailByToken(String token) {
        PasswordResetToken resetToken = tokenRepository.findByToken(token)
                .orElseThrow(() -> new RuntimeException("Invalid or expired token"));

        if (resetToken.isExpired()) {
            tokenRepository.delete(resetToken);
            throw new RuntimeException("Token has expired");
        }

        return resetToken.getEmail();
    }
}
