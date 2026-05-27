import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormationService, Quiz, Question, Option } from '../../../formation/formation/formation.service';

@Component({
  selector: 'app-formation-quiz',
  standalone: false,
  templateUrl: './formation-quiz.component.html',
  styleUrls: ['./formation-quiz.component.scss']
})
export class FormationQuizComponent implements OnInit {
  formationId!: number;
  quiz: Quiz = {
    title: '',
    questions: []
  };
  loading = true;
  saving = false;
  successMessage = '';
  errorMessage = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private formationService: FormationService
  ) {}

  ngOnInit(): void {
    this.formationId = Number(this.route.snapshot.paramMap.get('id'));
    if (this.formationId) {
      this.loadQuiz();
    }
  }

  loadQuiz(): void {
    this.formationService.getQuiz(this.formationId).subscribe({
      next: (quiz) => {
        if (quiz) {
            this.quiz = quiz;
        }
        this.loading = false;
      },
      error: (err) => {
        // If not found, we just keep the empty quiz object
        this.loading = false;
      }
    });
  }

  addQuestion(): void {
    const newQuestion: Question = {
      text: '',
      options: [
        { text: '', isCorrect: true },
        { text: '', isCorrect: false }
      ]
    };
    this.quiz.questions.push(newQuestion);
  }

  removeQuestion(index: number): void {
    this.quiz.questions.splice(index, 1);
  }

  addOption(questionIndex: number): void {
    this.quiz.questions[questionIndex].options.push({ text: '', isCorrect: false });
  }

  removeOption(questionIndex: number, optionIndex: number): void {
    this.quiz.questions[questionIndex].options.splice(optionIndex, 1);
  }

  setCorrectOption(questionIndex: number, optionIndex: number): void {
    this.quiz.questions[questionIndex].options.forEach((opt, idx) => {
      opt.isCorrect = (idx === optionIndex);
    });
  }

  onSave(): void {
    if (!this.quiz.title) {
        this.errorMessage = 'Please provide a quiz title.';
        return;
    }

    if (this.quiz.questions.length === 0) {
        this.errorMessage = 'Please add at least one question.';
        return;
    }

    this.saving = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.formationService.upsertQuiz(this.formationId, this.quiz).subscribe({
      next: (savedQuiz) => {
        this.quiz = savedQuiz;
        this.saving = false;
        this.successMessage = 'Quiz saved successfully!';
        setTimeout(() => this.successMessage = '', 3000);
      },
      error: (err) => {
        console.error('Error saving quiz', err);
        this.saving = false;
        this.errorMessage = 'Failed to save quiz. Please try again.';
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/admin/formations']);
  }
}
