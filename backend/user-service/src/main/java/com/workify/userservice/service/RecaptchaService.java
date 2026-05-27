package com.workify.userservice.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

@Service
@Slf4j
public class RecaptchaService {

    private final RestTemplate restTemplate;

    @Value("${google.recaptcha.secret-key:YOUR_SECRET_KEY}")
    private String secretKey;

    public RecaptchaService(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    public boolean verifyToken(String token, String expectedAction) {
        if (token == null || token.isEmpty()) {
            log.warn("reCAPTCHA token is missing");
            return false;
        }

        if ("YOUR_SECRET_KEY".equals(secretKey)) {
            log.warn("reCAPTCHA Secret Key is not configured. Skipping verification (returning true).");
            return true;
        }

        String url = "https://www.google.com/recaptcha/api/siteverify";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

        String body = String.format("secret=%s&response=%s", secretKey, token);
        HttpEntity<String> entity = new HttpEntity<>(body, headers);

        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> response = restTemplate.postForObject(url, entity, Map.class);

            if (response != null && Boolean.TRUE.equals(response.get("success"))) {
                log.info("reCAPTCHA verification successful");
                return true;
            } else {
                log.warn("reCAPTCHA verification failed: {}", response != null ? response.get("error-codes") : "null");
            }
        } catch (Exception e) {
            log.error("Error verifying reCAPTCHA token", e);
        }

        return false;
    }
}
