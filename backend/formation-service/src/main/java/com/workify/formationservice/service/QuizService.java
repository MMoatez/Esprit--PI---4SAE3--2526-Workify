package com.workify.formationservice.service;

import com.workify.formationservice.domain.*;
import com.workify.formationservice.repository.*;
import com.workify.formationservice.web.dto.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
@Slf4j
@RequiredArgsConstructor
public class QuizService {

    private final QuizRepository quizRepository;
    private final QuizResultRepository quizResultRepository;
    private final FormationRepository formationRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final CertificateService certificateService;

    public Optional<Quiz> getQuizByFormation(Long formationId) {
        return quizRepository.findByFormationId(formationId);
    }

    @Transactional
    public QuizResponse submitQuiz(Long formationId, QuizSubmissionRequest request) {
        // Prevent retaking if already passed
        boolean alreadyPassed = quizResultRepository.findByUserIdAndFormationId(request.getUserId(), formationId)
                .stream().anyMatch(QuizResult::isPassed);
        
        if (alreadyPassed) {
            log.info("User {} already passed formation {}. Ensuring status is COMPLETED.", request.getUserId(), formationId);
            // Safety: Ensure enrollment is COMPLETED if a pass result exists
            enrollmentRepository.findByUserIdAndFormationId(request.getUserId(), formationId)
                .ifPresent(enrollment -> {
                    if (enrollment.getStatus() != EnrollmentStatus.COMPLETED) {
                        enrollment.setStatus(EnrollmentStatus.COMPLETED);
                        enrollment.setCompletedAt(LocalDateTime.now());
                        enrollmentRepository.save(enrollment);
                    }
                });

            return QuizResponse.builder()
                    .score(100.0)
                    .passed(true)
                    .message("You have already passed this course assessment successfully.")
                    .build();
        }

        Quiz quiz = quizRepository.findByFormationId(formationId)
                .orElseThrow(() -> new RuntimeException("Quiz not found for formation: " + formationId));

        List<Question> questions = quiz.getQuestions();
        int totalQuestions = questions.size();
        int correctAnswers = 0;

        for (Question question : questions) {
            Long selectedOptionId = request.getAnswers().get(question.getId());
            log.info("Evaluating question {}: selected option {}", question.getId(), selectedOptionId);
            if (selectedOptionId != null) {
                boolean isCorrect = question.getOptions().stream()
                        .peek(o -> log.debug("Checking option {}: isCorrect={}", o.getId(), o.isCorrect()))
                        .filter(o -> o.getId().equals(selectedOptionId))
                        .map(Option::isCorrect)
                        .findFirst()
                        .orElse(false);
                if (isCorrect) {
                    log.info("Question {}: Correct answer!", question.getId());
                    correctAnswers++;
                } else {
                    log.info("Question {}: Incorrect answer.", question.getId());
                }
            } else {
                log.warn("No answer provided for question {}", question.getId());
            }
        }

        double score = totalQuestions > 0 ? (double) correctAnswers / totalQuestions * 100 : 0;
        boolean passed = score >= 50.0;

        // Save Result
        QuizResult result = QuizResult.builder()
                .userId(request.getUserId())
                .formation(quiz.getFormation())
                .score(score)
                .passed(passed)
                .submittedAt(LocalDateTime.now())
                .build();
        quizResultRepository.save(result);

        // Update Enrollment if passed
        if (passed) {
            enrollmentRepository.findByUserIdAndFormationId(request.getUserId(), formationId)
                .ifPresent(enrollment -> {
                    enrollment.setStatus(EnrollmentStatus.COMPLETED);
                    enrollment.setCompletedAt(LocalDateTime.now());
                    enrollmentRepository.save(enrollment);
                    
                    // Issue certificate
                    certificateService.issueCertificate(new CertificateRequest(request.getUserId(), formationId));
                });
        }

        return QuizResponse.builder()
                .score(score)
                .passed(passed)
                .message(passed ? "Congratulations! You passed the course." : "You did not pass. Please try again.")
                .build();
    }

    @Transactional
    public Quiz upsertQuiz(Long formationId, QuizRequest request) {
        Formation formation = formationRepository.findById(formationId)
                .orElseThrow(() -> new RuntimeException("Formation not found"));

        Quiz quiz = quizRepository.findByFormationId(formationId).orElse(new Quiz());
        quiz.setFormation(formation);
        quiz.setTitle(request.getTitle());

        // Simple approach: clear and rebuild questions for now
        if (quiz.getQuestions() != null) {
            quiz.getQuestions().clear();
        } else {
            quiz.setQuestions(new ArrayList<>());
        }

        for (QuestionRequest qReq : request.getQuestions()) {
            Question question = Question.builder()
                    .text(qReq.getText())
                    .quiz(quiz)
                    .options(new ArrayList<>())
                    .build();
            
            for (OptionRequest oReq : qReq.getOptions()) {
                Option option = Option.builder()
                        .text(oReq.getText())
                        .isCorrect(oReq.isCorrect())
                        .question(question)
                        .build();
                question.getOptions().add(option);
            }
            quiz.getQuestions().add(question);
        }

        return quizRepository.save(quiz);
    }
}
