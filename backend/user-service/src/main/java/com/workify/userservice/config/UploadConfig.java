package com.workify.userservice.config;

import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

import java.nio.file.Files;
import java.nio.file.Path;

@Configuration
public class UploadConfig {

    @Value("${app.upload.profile-dir:./uploads/profiles}")
    private String profileDir;

    @PostConstruct
    public void init() throws Exception {
        Path path = Path.of(profileDir);
        if (!Files.exists(path)) {
            Files.createDirectories(path);
        }
    }

    public String getProfileDir() {
        return profileDir;
    }
}
