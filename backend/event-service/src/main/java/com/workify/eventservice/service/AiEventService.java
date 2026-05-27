package com.workify.eventservice.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.workify.eventservice.Dto.EventDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class AiEventService {

  private final RestTemplate restTemplate;
  private final ObjectMapper objectMapper;

  @Value("${openai.api.key}")
  private String apiKey;

  @Value("${openai.api.url}")
  private String apiUrl;

  @Value("${openai.model}")
  private String model;

  // ===============================
  // CORE AI CALL (OpenAI/Groq format)
  // ===============================

  private String callOpenAI(String systemPrompt, String userPrompt) {
    try {
      HttpHeaders headers = new HttpHeaders();
      headers.setContentType(MediaType.APPLICATION_JSON);
      headers.set("Authorization", "Bearer " + apiKey);

      Map<String, Object> body = new LinkedHashMap<>();
      body.put("model", model);
      body.put("max_tokens", 1500);
      body.put("messages", List.of(
          Map.of("role", "system", "content", systemPrompt),
          Map.of("role", "user", "content", userPrompt)
      ));

      HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);
      ResponseEntity<String> response = restTemplate.postForEntity(apiUrl, entity, String.class);

      JsonNode root = objectMapper.readTree(response.getBody());
      return root.path("choices").get(0).path("message").path("content").asText();
    } catch (Exception e) {
      log.error("AI API call failed: {}", e.getMessage());
      throw new RuntimeException("AI service unavailable: " + e.getMessage());
    }
  }

  // ===============================
  // 1. GENERATE EVENT FROM PROMPT
  // ===============================

  public Map<String, Object> generateEventFromPrompt(String prompt, List<EventDto> existingEvents) {
    String existingContext = "";
    if (!existingEvents.isEmpty()) {
      existingContext = "\n\nÉvénements déjà planifiés (pour éviter les conflits) :\n";
      for (EventDto e : existingEvents.subList(0, Math.min(5, existingEvents.size()))) {
        existingContext += "- " + e.getTitle() + " le " + e.getEventDate() + " à " + e.getLocation() + "\n";
      }
    }

    String system = """
        Tu es un assistant expert en gestion d'événements professionnels pour la plateforme Workify.
        Tu génères des événements structurés en JSON UNIQUEMENT, sans texte avant ou après.
        Réponds TOUJOURS avec un JSON valide contenant exactement ces champs :
        {
          "title": "string",
          "description": "string (2-3 phrases pro)",
          "topic": "string",
          "location": "string",
          "capacity": number,
          "category": "TECHNOLOGY|DESIGN|MARKETING|FINANCE|ENTREPRENEURSHIP|DATA_SCIENCE|CYBERSECURITY|WEB_DEVELOPMENT|MOBILE_DEVELOPMENT|OTHER",
          "suggestedDate": "string (format: YYYY-MM-DDTHH:mm:00, date future optimale)",
          "estimatedAttendance": number,
          "successScore": number (0-100),
          "tips": ["conseil1", "conseil2", "conseil3"]
        }
        """;

    String userMsg = "Génère un événement professionnel basé sur cette demande : \"" + prompt + "\"" + existingContext;

    String raw = callOpenAI(system, userMsg);
    try {
      String json = extractJson(raw);
      @SuppressWarnings("unchecked")
      Map<String, Object> result = objectMapper.readValue(json, Map.class);
      return result;
    } catch (Exception e) {
      log.error("Failed to parse AI event response: {}", raw);
      throw new RuntimeException("Impossible de parser la réponse IA");
    }
  }

  // ===============================
  // 2. PREDICT ATTENDANCE
  // ===============================

  public Map<String, Object> predictAttendance(EventDto event, List<EventDto> history) {
    String historyContext = buildHistoryContext(history);
    String system = """
        Tu es un expert en prédiction de participation aux événements.
        Réponds UNIQUEMENT avec un JSON valide :
        {
          "predictedAttendance": number,
          "attendanceRate": number (0-100),
          "noShowRisk": "LOW|MEDIUM|HIGH",
          "confidence": number (0-100),
          "factors": [{"label": "string", "impact": "POSITIVE|NEGATIVE|NEUTRAL", "description": "string"}],
          "recommendations": ["string"],
          "bestTimeSlot": "string",
          "peakRegistrationDay": "string"
        }
        """;
    String userMsg = String.format(
        "Prédit la participation pour cet événement :\nTitre: %s\nCatégorie: %s\nCapacité: %d\nDate: %s\nLieu: %s\n\n%s",
        event.getTitle(), event.getCategory(), event.getCapacity(),
        event.getEventDate(), event.getLocation(), historyContext);

    String raw = callOpenAI(system, userMsg);
    try {
      @SuppressWarnings("unchecked")
      Map<String, Object> result = objectMapper.readValue(extractJson(raw), Map.class);
      return result;
    } catch (Exception e) {
      throw new RuntimeException("Erreur analyse prédictive");
    }
  }

  // ===============================
  // 3. POST-EVENT INSIGHTS
  // ===============================

  public Map<String, Object> generateInsights(Map<String, Object> analytics, String eventTitle) {
    String system = """
        Tu es un expert en analyse d'événements. Génère un rapport d'insights post-événement.
        Réponds UNIQUEMENT avec un JSON valide :
        {
          "overallScore": number (0-100),
          "summary": "string (2-3 phrases)",
          "highlights": ["string"],
          "improvements": ["string"],
          "insights": [{"title": "string", "value": "string", "trend": "UP|DOWN|STABLE", "explanation": "string"}],
          "nextEventRecommendation": "string",
          "partnerPerformance": "string",
          "audienceProfile": "string"
        }
        """;
    String userMsg = "Analyse les données de l'événement \"" + eventTitle + "\" :\n" + analytics.toString();

    String raw = callOpenAI(system, userMsg);
    try {
      @SuppressWarnings("unchecked")
      Map<String, Object> result = objectMapper.readValue(extractJson(raw), Map.class);
      return result;
    } catch (Exception e) {
      throw new RuntimeException("Erreur génération insights");
    }
  }

  // ===============================
  // 4. PARTNER RECOMMENDATIONS
  // ===============================

  public Map<String, Object> recommendPartners(EventDto event,
                                                List<Map<String, Object>> partners) {
    String system = """
        Tu es un moteur de recommandation de partenaires pour événements professionnels.
        Réponds UNIQUEMENT avec un JSON valide :
        {
          "recommendations": [
            {
              "ref": "string (partnerId)",
              "name": "string",
              "score": number (0-100),
              "matchReason": "string",
              "expectedContribution": "string",
              "risk": "LOW|MEDIUM|HIGH"
            }
          ],
          "topPickRef": "string",
          "analysisNote": "string"
        }
        """;
    String userMsg = String.format(
        "Recommande les meilleurs partenaires pour l'événement '%s' (catégorie: %s, sujet: %s).\nPartenaires disponibles : %s",
        event.getTitle(), event.getCategory(), event.getTopic(), partners.toString());

    String raw = callOpenAI(system, userMsg);
    try {
      @SuppressWarnings("unchecked")
      Map<String, Object> result = objectMapper.readValue(extractJson(raw), Map.class);
      return result;
    } catch (Exception e) {
      throw new RuntimeException("Erreur recommandation partenaires");
    }
  }

  // ===============================
  // 5. GENERATE INVITATION EMAIL
  // ===============================

  public Map<String, Object> generateInvitationEmail(EventDto event, String recipientType) {
    String system = """
        Tu es un expert en communication événementielle. Génère un email d'invitation professionnel.
        Réponds UNIQUEMENT avec un JSON valide :
        {
          "subject": "string",
          "body": "string (HTML simple avec <p>, <strong>, <br>)",
          "callToAction": "string",
          "tone": "string"
        }
        """;
    String userMsg = String.format(
        "Génère un email d'invitation pour l'événement '%s' le %s à %s.\nDestinataire : %s\nDescription : %s",
        event.getTitle(), event.getEventDate(), event.getLocation(),
        recipientType, event.getDescription());

    String raw = callOpenAI(system, userMsg);
    try {
      @SuppressWarnings("unchecked")
      Map<String, Object> result = objectMapper.readValue(extractJson(raw), Map.class);
      return result;
    } catch (Exception e) {
      throw new RuntimeException("Erreur génération email");
    }
  }

  // ===============================
  // 6. SMART SCHEDULE SUGGESTIONS
  // ===============================

  public Map<String, Object> suggestSchedule(String eventType, String category,
                                              List<EventDto> existingEvents) {
    String busyDates = "";
    for (EventDto e : existingEvents) {
      busyDates += "- " + e.getEventDate() + " (" + e.getTitle() + ")\n";
    }

    String system = """
        Tu es un expert en optimisation de calendrier d'événements.
        Réponds UNIQUEMENT avec un JSON valide :
        {
          "suggestions": [
            {
              "datetime": "string (YYYY-MM-DDTHH:mm:00)",
              "label": "string",
              "score": number (0-100),
              "reason": "string"
            }
          ],
          "bestSlot": "string (datetime)",
          "avoidDates": ["string"],
          "generalAdvice": "string"
        }
        """;
    String userMsg = String.format(
        "Suggère les meilleurs créneaux pour un événement de type '%s' catégorie '%s'.\n" +
        "Dates déjà occupées :\n%s\n" +
        "Propose 3 créneaux optimaux dans les 30 prochains jours (à partir du %s).",
        eventType, category, busyDates.isEmpty() ? "Aucune" : busyDates,
        new java.util.Date());

    String raw = callOpenAI(system, userMsg);
    try {
      @SuppressWarnings("unchecked")
      Map<String, Object> result = objectMapper.readValue(extractJson(raw), Map.class);
      return result;
    } catch (Exception e) {
      throw new RuntimeException("Erreur suggestions créneau");
    }
  }

  // ===============================
  // UTILS
  // ===============================

  // ===============================
  // 7. GENERATE REGISTRATION QUIZ
  // ===============================

  public Map<String, Object> generateRegistrationQuiz(String title, String topic, String description, String category) {
    String system = """
        Tu es un générateur de quiz professionnel pour la plateforme Workify.
        Tu génères UNIQUEMENT un JSON valide, sans texte avant ou après.
        Format strict :
        {
          "questions": [
            {
              "id": 1,
              "question": "Question claire et précise ?",
              "options": ["Option A", "Option B", "Option C", "Option D"],
              "correctIndex": 0,
              "explanation": "Explication courte de la bonne réponse"
            }
          ],
          "passingScore": 60,
          "totalQuestions": 5
        }
        - Génère exactement 5 questions
        - Chaque question a exactement 4 options
        - correctIndex est l'index (0-3) de la bonne réponse
        - Les questions doivent être pertinentes au sujet de l'événement
        - Niveau : accessible mais instructif (ni trop facile ni trop difficile)
        """;

    String user = String.format("""
        Génère un quiz d'accès pour cet événement :
        Titre : %s
        Sujet : %s
        Description : %s
        Catégorie : %s
        """, title, topic, description, category);

    try {
      String raw = callOpenAI(system, user);
      String json = extractJson(raw);
      return objectMapper.readValue(json, new com.fasterxml.jackson.core.type.TypeReference<Map<String, Object>>() {});
    } catch (Exception e) {
      log.error("Quiz generation failed: {}", e.getMessage());
      throw new RuntimeException("Impossible de générer le quiz: " + e.getMessage());
    }
  }

  private String extractJson(String text) {
    int start = text.indexOf('{');
    int end = text.lastIndexOf('}');
    if (start >= 0 && end > start) return text.substring(start, end + 1);
    return text;
  }

  private String buildHistoryContext(List<EventDto> history) {
    if (history.isEmpty()) return "Aucun historique disponible.";
    StringBuilder sb = new StringBuilder("Historique des événements passés :\n");
    for (EventDto e : history.subList(0, Math.min(5, history.size()))) {
      sb.append(String.format("- %s | Catégorie: %s | Inscrits: %d/%s\n",
          e.getTitle(), e.getCategory(), e.getTotalRegistrations(),
          e.getCapacity() != null ? e.getCapacity().toString() : "?"));
    }
    return sb.toString();
  }
}
