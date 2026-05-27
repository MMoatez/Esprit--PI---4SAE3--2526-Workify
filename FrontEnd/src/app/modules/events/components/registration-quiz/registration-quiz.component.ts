import {
  Component, Input, Output, EventEmitter, OnInit, OnDestroy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { EventService } from '../../../../core/services/event.service';

type QuizStep = 'loading' | 'intro' | 'question' | 'submitting' | 'result';

interface Question {
  id: number;
  question: string;
  options: string[];
}

interface Feedback {
  questionId: number;
  correct: boolean;
  correctIndex: number;
  explanation: string;
}

@Component({
  selector: 'app-registration-quiz',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="quiz-overlay" (click)="onOverlayClick($event)">
      <div class="quiz-modal" #modal>

        <!-- LOADING -->
        <div class="step-loading" *ngIf="step === 'loading'">
          <div class="ai-spinner">
            <div class="spinner-ring"></div>
            <span class="spinner-icon">🤖</span>
          </div>
          <p class="loading-text">L'IA prépare votre quiz...</p>
          <p class="loading-sub">Questions générées spécialement pour cet événement</p>
        </div>

        <!-- INTRO -->
        <div class="step-intro" *ngIf="step === 'intro'">
          <div class="intro-icon">🎯</div>
          <h2 class="intro-title">Quiz d'accès à l'événement</h2>
          <p class="intro-event">{{ eventTitle }}</p>
          <div class="intro-rules">
            <div class="rule-item"><span class="rule-icon">📝</span><span>{{ questions.length }} questions sur le sujet</span></div>
            <div class="rule-item"><span class="rule-icon">✅</span><span>Score minimum {{ passingScore }}% pour s'inscrire</span></div>
            <div class="rule-item"><span class="rule-icon">🤖</span><span>Questions générées par IA</span></div>
            <div class="rule-item"><span class="rule-icon">🔄</span><span>Réessayable si échec</span></div>
          </div>
          <div class="intro-actions">
            <button class="btn-cancel" (click)="cancel()">Annuler</button>
            <button class="btn-start" (click)="startQuiz()">Commencer le quiz →</button>
          </div>
        </div>

        <!-- QUESTION -->
        <div class="step-question" *ngIf="step === 'question'">

          <!-- Progress bar -->
          <div class="progress-header">
            <div class="progress-info">
              <span class="progress-label">Question {{ currentIndex + 1 }} / {{ questions.length }}</span>
              <span class="progress-score">{{ answeredCount }} réponses</span>
            </div>
            <div class="progress-bar-track">
              <div class="progress-bar-fill" [style.width.%]="progressPercent"></div>
            </div>
          </div>

          <!-- Question card -->
          <div class="question-card">
            <div class="question-number">Q{{ currentIndex + 1 }}</div>
            <p class="question-text">{{ currentQuestion.question }}</p>
          </div>

          <!-- Options -->
          <div class="options-grid">
            <button
              *ngFor="let opt of currentQuestion.options; let i = index"
              class="option-btn"
              [class.selected]="selectedAnswers[currentQuestion.id] === i"
              (click)="selectOption(i)">
              <span class="option-letter">{{ letters[i] }}</span>
              <span class="option-text">{{ opt }}</span>
            </button>
          </div>

          <!-- Navigation -->
          <div class="nav-actions">
            <button class="btn-prev" (click)="prevQuestion()" [disabled]="currentIndex === 0">← Précédent</button>
            <button class="btn-next" *ngIf="currentIndex < questions.length - 1"
              (click)="nextQuestion()" [disabled]="selectedAnswers[currentQuestion.id] === undefined">
              Suivant →
            </button>
            <button class="btn-submit" *ngIf="currentIndex === questions.length - 1"
              (click)="submitQuiz()" [disabled]="!allAnswered">
              Soumettre ✔
            </button>
          </div>
        </div>

        <!-- SUBMITTING -->
        <div class="step-loading" *ngIf="step === 'submitting'">
          <div class="ai-spinner">
            <div class="spinner-ring"></div>
            <span class="spinner-icon">📊</span>
          </div>
          <p class="loading-text">Correction en cours...</p>
        </div>

        <!-- RESULT -->
        <div class="step-result" *ngIf="step === 'result'">

          <!-- Score circle -->
          <div class="score-circle" [class.passed]="passed" [class.failed]="!passed">
            <svg viewBox="0 0 120 120" class="score-svg">
              <circle cx="60" cy="60" r="50" fill="none" stroke="#f1f5f9" stroke-width="10"/>
              <circle cx="60" cy="60" r="50" fill="none"
                [attr.stroke]="passed ? '#10b981' : '#ef4444'"
                stroke-width="10" stroke-linecap="round"
                [attr.stroke-dasharray]="scoreDash"
                stroke-dashoffset="0"
                transform="rotate(-90 60 60)"/>
            </svg>
            <div class="score-text">
              <span class="score-number">{{ score }}%</span>
              <span class="score-label">{{ passed ? '🎉 Réussi !' : '😔 Échoué' }}</span>
            </div>
          </div>

          <!-- Result message -->
          <div class="result-msg" [class.msg-pass]="passed" [class.msg-fail]="!passed">
            <p *ngIf="passed">
              ✅ Félicitations ! Vous avez obtenu <strong>{{ correctCount }}/{{ questions.length }}</strong> bonnes réponses.
              Vous pouvez maintenant vous inscrire à cet événement !
            </p>
            <p *ngIf="!passed">
              ❌ Vous avez obtenu <strong>{{ correctCount }}/{{ questions.length }}</strong> bonnes réponses.
              Le score minimum est {{ passingScore }}%. Réessayez !
            </p>
          </div>

          <!-- Feedback per question -->
          <div class="feedback-list">
            <div class="feedback-item" *ngFor="let fb of feedbackList; let i = index"
                 [class.fb-correct]="fb.correct" [class.fb-wrong]="!fb.correct">
              <div class="fb-header">
                <span class="fb-icon">{{ fb.correct ? '✅' : '❌' }}</span>
                <span class="fb-qtext">{{ questions[i].question }}</span>
              </div>
              <div class="fb-answer" *ngIf="!fb.correct">
                💡 Bonne réponse : <strong>{{ getOption(i, fb.correctIndex) }}</strong>
              </div>
              <div class="fb-explanation" *ngIf="fb.explanation">
                {{ fb.explanation }}
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="result-actions">
            <button class="btn-retry" *ngIf="!passed" (click)="retry()">🔄 Réessayer</button>
            <button class="btn-register" *ngIf="passed" (click)="confirmRegister()">
              🎟️ S'inscrire maintenant
            </button>
            <button class="btn-cancel" (click)="cancel()">Fermer</button>
          </div>
        </div>

      </div>
    </div>
  `,
  styles: [`
    /* Overlay */
    .quiz-overlay {
      position: fixed; inset: 0; background: rgba(15,23,42,.7);
      display: flex; align-items: center; justify-content: center;
      z-index: 1000; padding: 16px; backdrop-filter: blur(4px);
      animation: fadeIn .2s ease;
    }
    @keyframes fadeIn { from { opacity:0 } to { opacity:1 } }

    .quiz-modal {
      background: #fff; border-radius: 24px; width: 100%;
      max-width: 560px; max-height: 90vh; overflow-y: auto;
      padding: 32px; box-shadow: 0 24px 80px rgba(0,0,0,.25);
      animation: slideUp .25s ease;
    }
    @keyframes slideUp { from { transform:translateY(30px); opacity:0 } to { transform:translateY(0); opacity:1 } }

    /* Loading */
    .step-loading { text-align: center; padding: 40px 0; }
    .ai-spinner { position: relative; width: 72px; height: 72px; margin: 0 auto 20px; }
    .spinner-ring {
      width: 72px; height: 72px; border: 4px solid #e0e7ff;
      border-top-color: #6366f1; border-radius: 50%;
      animation: spin 1s linear infinite; position: absolute;
    }
    @keyframes spin { to { transform: rotate(360deg) } }
    .spinner-icon { position: absolute; inset: 0; display: flex; align-items: center;
      justify-content: center; font-size: 28px; }
    .loading-text { font-size: 18px; font-weight: 700; color: #1e293b; margin: 0 0 8px; }
    .loading-sub { font-size: 13px; color: #94a3b8; margin: 0; }

    /* Intro */
    .step-intro { text-align: center; }
    .intro-icon { font-size: 52px; margin-bottom: 12px; }
    .intro-title { font-size: 22px; font-weight: 800; color: #1e293b; margin: 0 0 6px; }
    .intro-event { font-size: 14px; color: #6366f1; font-weight: 600; margin: 0 0 24px; }
    .intro-rules { background: #f8fafc; border-radius: 14px; padding: 16px 20px;
      text-align: left; margin-bottom: 24px; display: flex; flex-direction: column; gap: 10px; }
    .rule-item { display: flex; align-items: center; gap: 10px; font-size: 14px; color: #475569; }
    .rule-icon { font-size: 18px; flex-shrink: 0; }
    .intro-actions { display: flex; gap: 12px; }

    /* Question */
    .step-question {}
    .progress-header { margin-bottom: 20px; }
    .progress-info { display: flex; justify-content: space-between;
      font-size: 13px; color: #64748b; margin-bottom: 8px; font-weight: 600; }
    .progress-bar-track { height: 8px; background: #f1f5f9; border-radius: 999px; overflow: hidden; }
    .progress-bar-fill { height: 100%; background: linear-gradient(90deg,#6366f1,#8b5cf6);
      border-radius: 999px; transition: width .4s ease; }

    .question-card { background: linear-gradient(135deg,#f0f4ff,#faf5ff);
      border: 1px solid #e0e7ff; border-radius: 16px; padding: 20px; margin-bottom: 20px; }
    .question-number { font-size: 12px; font-weight: 700; color: #6366f1;
      text-transform: uppercase; letter-spacing: .08em; margin-bottom: 8px; }
    .question-text { font-size: 16px; font-weight: 700; color: #1e293b; margin: 0; line-height: 1.5; }

    .options-grid { display: flex; flex-direction: column; gap: 10px; margin-bottom: 24px; }
    .option-btn {
      display: flex; align-items: center; gap: 14px;
      padding: 14px 18px; border: 2px solid #e2e8f0;
      border-radius: 12px; background: #fff; cursor: pointer;
      text-align: left; transition: all .15s; font-size: 14px; color: #334155;
    }
    .option-btn:hover { border-color: #a5b4fc; background: #f0f4ff; }
    .option-btn.selected { border-color: #6366f1; background: #eef2ff; color: #3730a3; }
    .option-letter {
      width: 30px; height: 30px; border-radius: 8px; background: #f1f5f9;
      display: flex; align-items: center; justify-content: center;
      font-weight: 800; font-size: 13px; flex-shrink: 0; color: #64748b;
    }
    .option-btn.selected .option-letter { background: #6366f1; color: #fff; }
    .option-text { flex: 1; font-weight: 500; }

    .nav-actions { display: flex; gap: 10px; justify-content: space-between; }

    /* Result */
    .step-result { text-align: center; }
    .score-circle { position: relative; width: 140px; height: 140px; margin: 0 auto 20px; }
    .score-svg { width: 100%; height: 100%; }
    circle { stroke-dashoffset: 0; transition: stroke-dasharray .6s ease; }
    .score-text { position: absolute; inset: 0; display: flex; flex-direction: column;
      align-items: center; justify-content: center; }
    .score-number { font-size: 28px; font-weight: 900; color: #1e293b; line-height: 1; }
    .score-label { font-size: 13px; font-weight: 600; margin-top: 4px; }

    .result-msg { border-radius: 12px; padding: 14px 18px; margin-bottom: 20px;
      font-size: 14px; text-align: left; line-height: 1.6; }
    .msg-pass { background: #d1fae5; color: #065f46; }
    .msg-fail { background: #fee2e2; color: #991b1b; }

    .feedback-list { display: flex; flex-direction: column; gap: 10px;
      margin-bottom: 24px; text-align: left; max-height: 250px; overflow-y: auto; }
    .feedback-item { border-radius: 12px; padding: 12px 16px; border: 1px solid; }
    .fb-correct { background: #f0fdf4; border-color: #bbf7d0; }
    .fb-wrong { background: #fff7ed; border-color: #fed7aa; }
    .fb-header { display: flex; gap: 10px; align-items: flex-start; margin-bottom: 6px; }
    .fb-icon { font-size: 16px; flex-shrink: 0; }
    .fb-qtext { font-size: 13px; font-weight: 600; color: #334155; line-height: 1.4; }
    .fb-answer { font-size: 13px; color: #78350f; margin-bottom: 4px; }
    .fb-explanation { font-size: 12px; color: #64748b; font-style: italic; }

    .result-actions { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; }

    /* Buttons */
    .btn-start {
      flex: 1; padding: 12px 24px;
      background: linear-gradient(135deg,#6366f1,#8b5cf6);
      color: #fff; border: none; border-radius: 12px;
      font-size: 15px; font-weight: 700; cursor: pointer; transition: opacity .2s;
    }
    .btn-start:hover { opacity: .9; }
    .btn-cancel {
      padding: 12px 20px; background: #f1f5f9; color: #475569;
      border: none; border-radius: 12px; font-size: 14px;
      font-weight: 600; cursor: pointer; transition: background .2s;
    }
    .btn-cancel:hover { background: #e2e8f0; }
    .btn-prev, .btn-next {
      padding: 10px 20px; border-radius: 10px; font-weight: 600;
      font-size: 14px; cursor: pointer; border: none; transition: all .2s;
    }
    .btn-prev { background: #f1f5f9; color: #64748b; }
    .btn-prev:disabled { opacity: .4; cursor: not-allowed; }
    .btn-next { background: #6366f1; color: #fff; flex: 1; }
    .btn-next:disabled { opacity: .4; cursor: not-allowed; }
    .btn-submit {
      flex: 1; padding: 10px 24px; background: #10b981; color: #fff;
      border: none; border-radius: 10px; font-size: 14px;
      font-weight: 700; cursor: pointer; transition: opacity .2s;
    }
    .btn-submit:disabled { opacity: .4; cursor: not-allowed; }
    .btn-retry {
      padding: 12px 24px; background: #f59e0b; color: #fff;
      border: none; border-radius: 12px; font-size: 14px;
      font-weight: 700; cursor: pointer;
    }
    .btn-register {
      padding: 12px 28px;
      background: linear-gradient(135deg,#10b981,#059669);
      color: #fff; border: none; border-radius: 12px;
      font-size: 15px; font-weight: 700; cursor: pointer;
    }
  `]
})
export class RegistrationQuizComponent implements OnInit, OnDestroy {
  @Input() eventId!: number;
  @Input() eventTitle = '';
  @Output() quizPassed = new EventEmitter<void>();
  @Output() quizCancelled = new EventEmitter<void>();

  step: QuizStep = 'loading';
  questions: Question[] = [];
  passingScore = 60;
  currentIndex = 0;
  selectedAnswers: Record<number, number> = {};
  feedbackList: Feedback[] = [];
  score = 0;
  correctCount = 0;
  passed = false;
  letters = ['A', 'B', 'C', 'D'];

  constructor(private eventService: EventService) {}

  ngOnInit(): void { this.loadQuiz(); }
  ngOnDestroy(): void { document.body.style.overflow = ''; }

  loadQuiz(): void {
    this.step = 'loading';
    document.body.style.overflow = 'hidden';
    this.eventService.getRegistrationQuiz(this.eventId).subscribe({
      next: data => {
        this.questions = data.questions;
        this.passingScore = data.passingScore ?? 60;
        this.step = 'intro';
      },
      error: () => {
        // If AI fails, skip quiz and allow registration
        this.quizPassed.emit();
      }
    });
  }

  startQuiz(): void {
    this.currentIndex = 0;
    this.selectedAnswers = {};
    this.step = 'question';
  }

  get currentQuestion(): Question { return this.questions[this.currentIndex]; }
  get progressPercent(): number { return ((this.currentIndex + 1) / this.questions.length) * 100; }
  get answeredCount(): number { return Object.keys(this.selectedAnswers).length; }
  get allAnswered(): boolean { return this.answeredCount === this.questions.length; }

  get scoreDash(): string {
    const circ = 2 * Math.PI * 50;
    const filled = (this.score / 100) * circ;
    return `${filled} ${circ - filled}`;
  }

  selectOption(index: number): void {
    this.selectedAnswers[this.currentQuestion.id] = index;
  }

  nextQuestion(): void {
    if (this.currentIndex < this.questions.length - 1) this.currentIndex++;
  }

  prevQuestion(): void {
    if (this.currentIndex > 0) this.currentIndex--;
  }

  submitQuiz(): void {
    this.step = 'submitting';
    const answers = Object.entries(this.selectedAnswers).map(([qId, idx]) => ({
      questionId: +qId, selectedIndex: idx
    }));
    this.eventService.validateQuiz(this.eventId, answers).subscribe({
      next: res => {
        this.score = res.score;
        this.correctCount = res.correct;
        this.passed = res.passed;
        this.feedbackList = res.feedback;
        this.step = 'result';
      },
      error: () => {
        // On error, skip and allow
        this.quizPassed.emit();
      }
    });
  }

  retry(): void {
    this.selectedAnswers = {};
    this.loadQuiz();
  }

  confirmRegister(): void {
    document.body.style.overflow = '';
    this.quizPassed.emit();
  }

  cancel(): void {
    document.body.style.overflow = '';
    this.quizCancelled.emit();
  }

  onOverlayClick(e: MouseEvent): void {
    if ((e.target as HTMLElement).classList.contains('quiz-overlay')) this.cancel();
  }

  getOption(questionIndex: number, optionIndex: number): string {
    return this.questions[questionIndex]?.options?.[optionIndex] ?? '';
  }
}
