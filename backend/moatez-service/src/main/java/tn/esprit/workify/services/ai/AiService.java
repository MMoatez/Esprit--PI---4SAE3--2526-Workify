package tn.esprit.workify.services.ai;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@Slf4j
public class AiService {

    @Value("${gemini.api.key:}")
    private String geminiApiKey;

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    public AiService() {
        this.restTemplate = new RestTemplate();
        this.objectMapper = new ObjectMapper();
    }

    /**
     * Extraire les tâches à partir de la description du projet
     */
    public List<String> extractTasksFromDescription(String description) {
        if (description == null || description.trim().isEmpty()) {
            log.warn("⚠️ Description is empty, cannot extract tasks");
            return new ArrayList<>();
        }

        try {
            if (geminiApiKey != null && !geminiApiKey.isEmpty()) {
                log.info("🤖 Using Gemini AI for task extraction");
                List<String> geminiTasks = extractTasksWithGemini(description);
                if (!geminiTasks.isEmpty()) {
                    return geminiTasks;
                }
                log.warn("⚠️ Gemini returned no tasks, falling back to keyword-based extraction");
            } else {
                log.warn("⚠️ No Gemini API key configured, using keyword-based extraction");
            }
            return extractTasksWithKeywords(description);
        } catch (Exception e) {
            log.error("❌ Error extracting tasks with AI: {}", e.getMessage());
            log.info("🔄 Falling back to keyword-based extraction");
            return extractTasksWithKeywords(description);
        }
    }

    /**
     * Extraction avec Gemini API (Google Gemini 2.5 Flash)
     */
    private List<String> extractTasksWithGemini(String description) {
        try {
            String url = "https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=" + geminiApiKey;

            String prompt = String.format(
                    "Analyse cette description de projet et extrais UNIQUEMENT les fonctionnalités principales sous forme de liste de tâches courtes et claires. " +
                            "Retourne SEULEMENT la liste des tâches, une par ligne, sans numérotation, sans tirets, sans texte supplémentaire.\n\n" +
                            "Description du projet:\n%s\n\n" +
                            "Exemple de format attendu:\n" +
                            "Système de Messagerie\n" +
                            "Système de Notifications\n" +
                            "Gestion Utilisateur & Interface",
                    description
            );

            // Construction du corps de la requête
            Map<String, Object> requestBody = new HashMap<>();
            List<Map<String, Object>> contents = new ArrayList<>();
            Map<String, Object> content = new HashMap<>();
            List<Map<String, String>> parts = new ArrayList<>();
            Map<String, String> part = new HashMap<>();

            part.put("text", prompt);
            parts.add(part);
            content.put("parts", parts);
            contents.add(content);
            requestBody.put("contents", contents);

            // Headers
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            // Requête
            HttpEntity<Map<String, Object>> request = new HttpEntity<>(requestBody, headers);

            log.info("📡 Calling Gemini API (gemini-2.5-flash)...");
            ResponseEntity<String> response = restTemplate.postForEntity(url, request, String.class);

            if (response.getStatusCode() == HttpStatus.OK) {
                log.info("✅ Gemini API response received");

                JsonNode root = objectMapper.readTree(response.getBody());
                String aiResponse = root.path("candidates").get(0)
                        .path("content").path("parts").get(0)
                        .path("text").asText();

                log.info("📝 AI Response:\n{}", aiResponse);

                List<String> tasks = parseTasksFromText(aiResponse);
                log.info("✅ Parsed {} tasks from AI response", tasks.size());

                return tasks;
            } else {
                log.error("❌ Gemini API returned status: {}", response.getStatusCode());
            }
        } catch (Exception e) {
            log.error("❌ Gemini API error: {}", e.getMessage());
            log.info("🔄 Falling back to keyword-based extraction");
        }

        return new ArrayList<>();
    }

    /**
     * Extraction simple par mots-clés (fallback si l'API Gemini échoue)
     */
    private List<String> extractTasksWithKeywords(String description) {
        log.info("🔍 Using keyword-based extraction (fallback method)");
        List<String> tasks = new ArrayList<>();

        String[] keywords = {
                "système", "gestion", "interface", "plateforme", "module",
                "messagerie", "notification", "utilisateur", "authentification",
                "dashboard", "api", "base de données", "sécurité", "backend",
                "frontend", "mobile", "web", "serveur", "client", "compte",
                "profil", "recherche", "filtre", "export", "import", "rapport"
        };

        for (String keyword : keywords) {
            if (description.toLowerCase().contains(keyword.toLowerCase())) {
                // Capitaliser la première lettre
                String task = keyword.substring(0, 1).toUpperCase() + keyword.substring(1);
                if (!tasks.contains(task)) {
                    tasks.add(task);
                    log.info("   ✓ Found keyword: {}", task);
                }
            }
        }

        if (tasks.isEmpty()) {
            log.warn("⚠️ No keywords found, adding default task");
            return List.of("Tâche initiale du projet");
        }

        log.info("✅ Extracted {} tasks using keywords", tasks.size());
        return tasks;
    }

    /**
     * Parser la réponse de l'IA en liste de tâches
     */
    private List<String> parseTasksFromText(String text) {
        List<String> tasks = new ArrayList<>();

        if (text == null || text.trim().isEmpty()) {
            log.warn("⚠️ AI response is empty");
            return tasks;
        }

        // Nettoyer le texte
        text = text.trim();

        // Séparer par lignes
        String[] lines = text.split("\\n");

        log.info("🔍 Parsing {} lines from AI response", lines.length);

        for (String line : lines) {
            line = line.trim();

            // Ignorer les lignes vides ou trop courtes
            if (line.isEmpty() || line.length() < 3) {
                continue;
            }

            // Nettoyer les numéros, tirets, astérisques
            line = line.replaceAll("^[\\d]+[\\.\\)\\-]\\s*", "");      // Numéros (1. 2) 3-)
            line = line.replaceAll("^[-*•]\\s*", "");                   // Tirets et puces
            line = line.replaceAll("^[\\*\\-]+\\s*", "");               // Astérisques multiples
            line = line.trim();

            // Ajouter si non vide et pas trop long
            if (!line.isEmpty() && line.length() >= 3 && line.length() <= 100) {
                tasks.add(line);
                log.info("   ✓ Parsed task: {}", line);
            }
        }

        log.info("✅ Successfully parsed {} tasks", tasks.size());
        return tasks;
    }
}