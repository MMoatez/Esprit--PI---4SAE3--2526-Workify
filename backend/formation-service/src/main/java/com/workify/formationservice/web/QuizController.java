package com.workify.formationservice.web;

import com.workify.formationservice.domain.Quiz;
import com.workify.formationservice.service.QuizService;
import com.workify.formationservice.web.dto.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/formations/{id}/quiz")
@RequiredArgsConstructor
public class QuizController {

    private final QuizService quizService;

    @GetMapping
    public ResponseEntity<Quiz> getQuiz(@PathVariable Long id) {
        return quizService.getQuizByFormation(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/submit")
    public ResponseEntity<QuizResponse> submitQuiz(@PathVariable Long id, @RequestBody QuizSubmissionRequest request) {
        return ResponseEntity.ok(quizService.submitQuiz(id, request));
    }

    @PostMapping("/admin")
    public ResponseEntity<Quiz> upsertQuiz(@PathVariable Long id, @RequestBody QuizRequest request) {
        return ResponseEntity.ok(quizService.upsertQuiz(id, request));
    }
}
