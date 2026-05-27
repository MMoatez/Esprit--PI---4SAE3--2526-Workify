package com.workify.userservice.config;

import com.workify.userservice.service.KeycloakAdminService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements CommandLineRunner {

    private final KeycloakAdminService keycloakAdminService;

    @Override
    public void run(String... args) throws Exception {
        log.info("Checking for default admin user...");
        String adminEmail = "admin@workify.com";

        if (keycloakAdminService.getUser(adminEmail).isEmpty()) {
            log.info("Default admin user not found. Creating...");
            try {
                keycloakAdminService.createUser(
                        adminEmail,
                        "password", // Default password
                        "Admin",
                        "Workify",
                        "ADMIN");
                log.info("Default admin user created successfully: {}", adminEmail);
            } catch (Exception e) {
                log.error("Failed to create default admin user", e);
            }
        } else {
            log.info("Default admin user already exists: {}", adminEmail);
        }
    }
}
