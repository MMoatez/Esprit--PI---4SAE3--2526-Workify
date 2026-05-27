package com.workify.projectservice.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.*;

@Service
@RequiredArgsConstructor
public class SkillExtractionService {

    private final WebClient groqClient;

    public List<String> extractSkills(String description) {

        try {

            Map<String, Object> request = Map.of(
                    "model", "llama-3.1-8b-instant",
                    "messages", List.of(
                            Map.of(
                                    "role", "user",
                                    "content",
                                    "Extrait uniquement les compétences techniques présentes dans ce texte. " +
                                            "Retourne une liste simple séparée par des virgules.\n\n" +
                                            description
                            )
                    ),
                    "temperature", 0.2,
                    "max_tokens", 100
            );

            Map<String, Object> response = groqClient.post()
                    .uri("/chat/completions")
                    .bodyValue(request)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();

            List<Map<String, Object>> choices =
                    (List<Map<String, Object>>) response.get("choices");

            Map<String, Object> message =
                    (Map<String, Object>) choices.get(0).get("message");

            String content = message.get("content").toString();

            return Arrays.stream(content.split(","))
                    .map(String::trim)
                    .toList();

        } catch (Exception e) {
            return Collections.emptyList();
        }
    }
}