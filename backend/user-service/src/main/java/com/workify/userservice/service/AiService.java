package com.workify.userservice.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
@Slf4j
@RequiredArgsConstructor
public class AiService {

    private final RestTemplate restTemplate;

    @Value("${keycloak.openrouter.api-key}")
    private String apiKey;

    @Value("${keycloak.openrouter.model}")
    private String model;

    private static final String OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

    public List<String> extractCompetences(byte[] pdfBytes, String userRole) {
        if (pdfBytes == null || pdfBytes.length == 0) {
            return new ArrayList<>();
        }

        log.info("Requesting competence extraction from OpenRouter (model: {}, user role hint: {})", model, userRole);

        int maxRetries = 2;
        int attempts = 0;

        while (attempts < maxRetries) {
            attempts++;
            try {
                String extractedText = extractTextFromPdf(pdfBytes);
                log.info("Extracted text length: {} (Attempt {}/{})", extractedText.length(), attempts, maxRetries);

                HttpHeaders headers = new HttpHeaders();
                headers.setContentType(MediaType.APPLICATION_JSON);
                headers.set("Authorization", "Bearer " + apiKey);

                String prompt = String.format(
                        "You are a professional CV analyzer. Extract a clean list of technical and professional competences (skills) from the provided CV text. "
                                +
                                "Target Role: %s. " +
                                "Guidelines: " +
                                "1. Focus on hard skills (programming languages, frameworks, tools, methodologies). " +
                                "2. Include languages (e.g., English, French) if mentioned. " +
                                "3. If the text is sparse, infer relevant skills from the role. " +
                                "4. Return ONLY a JSON array of strings.\n\n" +
                                "CV Content:\n%s",
                        userRole != null ? userRole : "Software Engineer",
                        extractedText.isEmpty() ? "[Could not extract text from PDF]" : extractedText);

                List<Map<String, Object>> contentParts = new ArrayList<>();
                contentParts.add(Map.of("type", "text", "text", prompt));

                if (extractedText.isEmpty()) {
                    String base64Pdf = java.util.Base64.getEncoder().encodeToString(pdfBytes);
                    contentParts.add(Map.of(
                            "type", "file",
                            "file", Map.of(
                                    "type", "application/pdf",
                                    "data", base64Pdf)));
                }

                Map<String, Object> requestBody = Map.of(
                        "model", model,
                        "messages", List.of(
                                Map.of("role", "user", "content", contentParts)));

                HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

                log.info("Sending request to OpenRouter (attempt {})...", attempts);
                Map<String, Object> response = restTemplate.postForObject(OPENROUTER_URL, entity, Map.class);
                log.info("Full OpenRouter raw response: {}", response);

                if (response != null && response.containsKey("error")) {
                    Map<String, Object> errorMap = (Map<String, Object>) response.get("error");
                    String errMsg = String.valueOf(errorMap.get("message"));
                    // OpenRouter error codes can be integers or strings, handle defensively
                    Object codeObj = errorMap.get("code");
                    int code = 0;
                    if (codeObj instanceof Integer) {
                        code = (int) codeObj;
                    } else if (codeObj != null) {
                        try {
                            code = Integer.parseInt(String.valueOf(codeObj));
                        } catch (NumberFormatException nfe) {
                            // Ignore, code remains 0
                        }
                    }

                    log.error("OpenRouter error (attempt {}): {} (code: {})", attempts, errMsg, code);

                    if ((code == 502 || code == 504 || errMsg.toLowerCase().contains("connection"))
                            && attempts < maxRetries) {
                        log.info("Transient error detected, retrying in 2 seconds...");
                        Thread.sleep(2000);
                        continue;
                    }
                    return generateFallbackCompetences(userRole);
                }

                if (response != null && response.containsKey("choices")) {
                    List<Map<String, Object>> choices = (List<Map<String, Object>>) response.get("choices");
                    if (!choices.isEmpty()) {
                        String content = (String) ((Map<String, Object>) choices.get(0).get("message")).get("content");
                        log.info("AI content response: {}", content);
                        return parseCompetences(content);
                    }
                }
                break; // Success or non-retryable error
            } catch (Exception e) {
                log.error("AI extraction attempt {} failed", attempts, e);
                if (attempts < maxRetries) {
                    try {
                        Thread.sleep(2000);
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                    }
                    continue;
                }
            }
        }

        return generateFallbackCompetences(userRole);
    }

    private String extractTextFromPdf(byte[] pdfBytes) {
        try (PDDocument document = PDDocument.load(pdfBytes)) {
            PDFTextStripper stripper = new PDFTextStripper();
            // Best practice: ensure text is sorted by position to maintain logical order
            stripper.setSortByPosition(true);
            return stripper.getText(document).trim();
        } catch (IOException e) {
            log.error("Failed to extract text from PDF", e);
            return "";
        }
    }

    private List<String> generateFallbackCompetences(String userRole) {
        log.info("Generating fallback competences for role: {}", userRole);
        if ("CLIENT".equalsIgnoreCase(userRole)) {
            return List.of("Recrutement", "Gestion d'équipe", "Stratégie", "Entretien", "Négociation");
        }
        return List.of("Gestion de projet", "Analyse", "Communication", "Organisation", "Adaptabilité");
    }

    private List<String> parseCompetences(String content) {
        // Basic extraction of JSON array if the model includes extra text
        try {
            int start = content.indexOf("[");
            int end = content.lastIndexOf("]");
            if (start != -1 && end != -1) {
                String jsonArray = content.substring(start, end + 1);
                // Simple parsing for strings in quotes
                List<String> result = new ArrayList<>();
                java.util.regex.Matcher m = java.util.regex.Pattern.compile("\"([^\"]*)\"").matcher(jsonArray);
                while (m.find()) {
                    result.add(m.group(1));
                }
                return result;
            }
        } catch (Exception e) {
            log.warn("Failed to parse AI response content: {}", content);
        }
        return List.of("Erreur de parsing IA");
    }
}
