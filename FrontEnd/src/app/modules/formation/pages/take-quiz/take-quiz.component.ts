import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormationService, Quiz, QuizSubmission, QuizResponse } from '../../formation/formation.service';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-take-quiz',
  standalone: false,
  templateUrl: './take-quiz.component.html',
  styleUrls: ['./take-quiz.component.scss']
})
export class TakeQuizComponent implements OnInit {
  formationId!: number;
  quiz?: Quiz;
  answers: { [key: number]: number } = {};
  submitting = false;
  result?: QuizResponse;
  loading = true;
  alreadyPassed = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private formationService: FormationService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.formationId = Number(this.route.snapshot.paramMap.get('id'));
    if (this.formationId) {
      this.checkIfAlreadyPassed();
    }
  }

  checkIfAlreadyPassed(): void {
    const userId = this.authService.getUserId();
    if (!userId) {
      this.loadQuiz();
      return;
    }

    // Double check: check enrollment first as it's the primary status indicator
    this.formationService.checkEnrollment(this.formationId).subscribe({
      next: (enrollment) => {
        if (enrollment.status === 'COMPLETED') {
          this.alreadyPassed = true;
          this.loading = false;
        } else {
          // Fallback: check certificates just in case
          this.checkCertificates(userId);
        }
      },
      error: (err) => {
        console.warn('TakeQuizComponent: Enrollment check failed, falling back to certificates:', err);
        this.checkCertificates(userId);
      }
    });
  }

  private checkCertificates(userId: string): void {
    this.formationService.getUserCertificates(userId).subscribe({
      next: (certs) => {
        const hasCert = certs.some(c => {
          if (!c.formation || !c.formation.id) return false;
          return Number(c.formation.id) === Number(this.formationId);
        });
        
        if (hasCert) {
          this.alreadyPassed = true;
          this.loading = false;
        } else {
          this.loadQuiz();
        }
      },
      error: (err) => {
        console.error('TakeQuizComponent: Error fetching certificates:', err);
        this.loadQuiz();
      }
    });
  }

  loadQuiz(): void {
    this.formationService.getQuiz(this.formationId).subscribe({
      next: (quiz) => {
        this.quiz = quiz;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading quiz', err);
        this.loading = false;
      }
    });
  }

  onSelectOption(questionId: number, optionId: number): void {
    this.answers[questionId] = optionId;
  }

  onSubmit(): void {
    if (!this.quiz) return;
    
    const userId = this.authService.getUserId();
    if (!userId) {
      alert('You must be logged in to submit the quiz.');
      return;
    }

    this.submitting = true;
    const submission: QuizSubmission = {
      userId,
      answers: this.answers
    };

    this.formationService.submitQuiz(this.formationId, submission).subscribe({
      next: (response) => {
        this.result = response;
        this.submitting = false;
      },
      error: (err) => {
        console.error('Error submitting quiz', err);
        this.submitting = false;
        alert('An error occurred. Please try again.');
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/formation/my-courses']);
  }

  viewCertificate(): void {
    this.router.navigate(['/formation/my-certificates']);
  }
}
