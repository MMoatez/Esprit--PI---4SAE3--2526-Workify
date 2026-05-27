package com.workify.formationservice.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConfigurationProperties(prefix = "app.upload")
@Getter
@Setter
public class UploadConfig {
    private String lessonPdfDir;
}
