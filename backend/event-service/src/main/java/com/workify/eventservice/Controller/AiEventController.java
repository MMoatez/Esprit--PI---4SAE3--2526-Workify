package com.workify.eventservice.Controller;

import com.workify.eventservice.Dto.EventDto;
import com.workify.eventservice.service.AiEventService;
import com.workify.eventservice.service.EventService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/events/ai")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:4200")
public class AiEventController {

  private final AiEventService aiEventService;
  private final EventService eventService;

  // ===============================
  // 1. GENERATE EVENT FROM PROMPT
  // ===============================

  @PostMapping("/generate-event")
  @PreAuthorize("hasRole('ADMIN')")
  public ResponseEntity<Map<String, Object>> generateEvent(
      @RequestBody Map<String, String> body) {
    String prompt = body.get("prompt");
    if (prompt == null || prompt.isBlank())
      return ResponseEntity.badRequest().body(Map.of("error", "prompt requis"));

    List<EventDto> existing = eventService.getAllEvents();
    return ResponseEntity.ok(aiEventService.generateEventFromPrompt(prompt, existing));
  }

  // ===============================
  // 2. PREDICT ATTENDANCE
  // ===============================

  @GetMapping("/predict/{id}")
  @PreAuthorize("hasRole('ADMIN')")
  public ResponseEntity<Map<String, Object>> predictAttendance(@PathVariable Long id) {
    EventDto event = eventService.getEventById(id);
    List<EventDto> history = eventService.getAllEvents();
    return ResponseEntity.ok(aiEventService.predictAttendance(event, history));
  }

  // ===============================
  // 3. POST-EVENT INSIGHTS
  // ===============================

  @GetMapping("/insights/{id}")
  @PreAuthorize("hasRole('ADMIN')")
  public ResponseEntity<Map<String, Object>> getInsights(@PathVariable Long id) {
    EventDto event = eventService.getEventById(id);
    Map<String, Object> analytics = eventService.getEventAnalytics(id);
    return ResponseEntity.ok(aiEventService.generateInsights(analytics, event.getTitle()));
  }

  // ===============================
  // 4. RECOMMEND PARTNERS
  // ===============================

  @GetMapping("/recommend-partners/{id}")
  @PreAuthorize("hasRole('ADMIN')")
  public ResponseEntity<Map<String, Object>> recommendPartners(
      @PathVariable Long id,
      @RequestHeader("Authorization") String token) {
    EventDto event = eventService.getEventById(id);
    List<com.workify.eventservice.Dto.PartnerSummaryDto> partners =
        eventService.getAvailablePartners(id, token);

    List<Map<String, Object>> partnerList = new ArrayList<>();
    for (var p : partners) {
      Map<String, Object> pm = new LinkedHashMap<>();
      pm.put("ref", p.getRef());
      pm.put("name", p.getName());
      pm.put("organization", p.getOrganization());
      partnerList.add(pm);
    }
    return ResponseEntity.ok(aiEventService.recommendPartners(event, partnerList));
  }

  // ===============================
  // 5. GENERATE INVITATION EMAIL
  // ===============================

  @PostMapping("/generate-email/{id}")
  @PreAuthorize("hasRole('ADMIN')")
  public ResponseEntity<Map<String, Object>> generateEmail(
      @PathVariable Long id,
      @RequestBody Map<String, String> body) {
    EventDto event = eventService.getEventById(id);
    String recipientType = body.getOrDefault("recipientType", "participant");
    return ResponseEntity.ok(aiEventService.generateInvitationEmail(event, recipientType));
  }

  // ===============================
  // 7. REGISTRATION QUIZ
  // ===============================

  @GetMapping("/quiz/{id}")
  @PreAuthorize("isAuthenticated()")
  public ResponseEntity<Map<String, Object>> getRegistrationQuiz(@PathVariable Long id) {
    EventDto event = eventService.getEventById(id);
    Map<String, Object> quiz = aiEventService.generateRegistrationQuiz(
        event.getTitle(),
        event.getTopic() != null ? event.getTopic() : "",
        event.getDescription() != null ? event.getDescription() : "",
        event.getCategory() != null ? event.getCategory().name() : "OTHER"
    );
    // Strip correct answers before sending to client
    List<Map<String, Object>> questions = (List<Map<String, Object>>) quiz.get("questions");
    List<Map<String, Object>> safeQuestions = new ArrayList<>();
    for (Map<String, Object> q : questions) {
      Map<String, Object> safe = new LinkedHashMap<>(q);
      safe.remove("correctIndex");
      safe.remove("explanation");
      safeQuestions.add(safe);
    }
    Map<String, Object> result = new LinkedHashMap<>();
    result.put("questions", safeQuestions);
    result.put("passingScore", quiz.get("passingScore"));
    result.put("totalQuestions", quiz.get("totalQuestions"));
    result.put("eventTitle", event.getTitle());
    return ResponseEntity.ok(result);
  }

  @PostMapping("/quiz/{id}/validate")
  @PreAuthorize("isAuthenticated()")
  public ResponseEntity<Map<String, Object>> validateQuiz(
      @PathVariable Long id,
      @RequestBody Map<String, Object> body) {
    EventDto event = eventService.getEventById(id);
    // Re-generate with correct answers to validate
    Map<String, Object> quiz = aiEventService.generateRegistrationQuiz(
        event.getTitle(),
        event.getTopic() != null ? event.getTopic() : "",
        event.getDescription() != null ? event.getDescription() : "",
        event.getCategory() != null ? event.getCategory().name() : "OTHER"
    );
    // answers: [{"questionId":1,"selectedIndex":2}, ...]
    List<Map<String, Object>> answers = (List<Map<String, Object>>) body.get("answers");
    List<Map<String, Object>> questions = (List<Map<String, Object>>) quiz.get("questions");

    int correct = 0;
    List<Map<String, Object>> feedback = new ArrayList<>();
    for (Map<String, Object> q : questions) {
      int qId = ((Number) q.get("id")).intValue();
      int correctIdx = ((Number) q.get("correctIndex")).intValue();
      int selected = answers.stream()
          .filter(a -> ((Number) a.get("questionId")).intValue() == qId)
          .mapToInt(a -> ((Number) a.get("selectedIndex")).intValue())
          .findFirst().orElse(-1);
      boolean isCorrect = selected == correctIdx;
      if (isCorrect) correct++;
      Map<String, Object> fb = new LinkedHashMap<>();
      fb.put("questionId", qId);
      fb.put("correct", isCorrect);
      fb.put("correctIndex", correctIdx);
      fb.put("explanation", q.get("explanation"));
      feedback.add(fb);
    }

    int total = questions.size();
    int score = total > 0 ? (int) Math.round((double) correct / total * 100) : 0;
    int passingScore = ((Number) quiz.getOrDefault("passingScore", 60)).intValue();
    boolean passed = score >= passingScore;

    Map<String, Object> result = new LinkedHashMap<>();
    result.put("score", score);
    result.put("correct", correct);
    result.put("total", total);
    result.put("passed", passed);
    result.put("passingScore", passingScore);
    result.put("feedback", feedback);
    return ResponseEntity.ok(result);
  }

  // ===============================
  // 6. SMART SCHEDULE
  // ===============================

  @PostMapping("/suggest-schedule")
  @PreAuthorize("hasRole('ADMIN')")
  public ResponseEntity<Map<String, Object>> suggestSchedule(
      @RequestBody Map<String, String> body) {
    String eventType = body.getOrDefault("eventType", "conférence");
    String category = body.getOrDefault("category", "TECHNOLOGY");
    List<EventDto> existing = eventService.getAllEvents();
    return ResponseEntity.ok(aiEventService.suggestSchedule(eventType, category, existing));
  }
}
