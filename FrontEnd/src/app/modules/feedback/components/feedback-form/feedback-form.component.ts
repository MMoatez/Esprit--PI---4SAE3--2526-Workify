import { Component, Input, Output, EventEmitter, OnInit, ElementRef, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FeedbackService } from '../../../../core/services/feedback.service';
import { FeedbackDto } from '../../../../core/models/feedback.model';
import { AuthService } from '../../../../core/services/auth.service';
import { finalize, forkJoin, of } from 'rxjs';

@Component({
  standalone: false,
  selector: 'app-feedback-form',
  templateUrl: './feedback-form.component.html',
  styleUrls: ['./feedback-form.component.css']
})
export class FeedbackFormComponent implements OnInit {

  @Input() offerId!: number;
  @Input() projectTitle = '';
  @Input() projectCategory = 'AUTRE';
  @Output() submitted = new EventEmitter<FeedbackDto>();
  @Output() cancelled = new EventEmitter<void>();

  @ViewChild('commentArea') commentArea!: ElementRef<HTMLTextAreaElement>;
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  form!: FormGroup;
  submitting = false;
  error: string | null = null;
  isSpamError     = false;
  isSpamChoice    = false;   // shows "edit OR submit for review" buttons
  isPendingReview = false;   // shows "waiting for admin" (locked)
  requestingReview = false;

  // AI suggestions (generated from ratings — pure frontend)
  suggestions: string[] = [];
  summary = '';

  // Emoji picker
  showEmojiPicker = false;

  // Attachments
  pendingFiles: File[] = [];
  uploadedUrls: string[] = [];
  uploadingFiles = false;
  uploadError: string | null = null;

  readonly ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'video/mp4'];
  readonly MAX_FILES = 5;
  readonly MAX_SIZE_MB = 20;

  // ── Critères dynamiques par catégorie de projet ──────────────────────────

  private static readonly CATEGORY_CRITERIA: Record<string, { key: string; label: string; icon: string }[]> = {
    DEVELOPPEMENT_SPECIFIQUE: [
      { key: 'ratingGlobal',          label: 'Overall satisfaction',          icon: '⭐' },
      { key: 'ratingCommunication',   label: 'Communication & responsiveness',icon: '💬' },
      { key: 'ratingQuality',         label: 'Code quality & cleanliness',    icon: '🖥️' },
      { key: 'ratingDeadline',        label: 'Delivery & deadlines',          icon: '📦' },
      { key: 'ratingProfessionalism', label: 'Respect of specifications',     icon: '📋' },
    ],
    APPLICATION_MOBILE: [
      { key: 'ratingGlobal',          label: 'Overall satisfaction',          icon: '⭐' },
      { key: 'ratingCommunication',   label: 'Communication & responsiveness',icon: '💬' },
      { key: 'ratingQuality',         label: 'App quality & performance',     icon: '📱' },
      { key: 'ratingDeadline',        label: 'Delivery & deadlines',          icon: '📦' },
      { key: 'ratingProfessionalism', label: 'Respect of specifications',     icon: '📋' },
    ],
    SITE_WEB: [
      { key: 'ratingGlobal',          label: 'Overall satisfaction',          icon: '⭐' },
      { key: 'ratingCommunication',   label: 'Communication & responsiveness',icon: '💬' },
      { key: 'ratingQuality',         label: 'Design & technical quality',    icon: '🌐' },
      { key: 'ratingDeadline',        label: 'Delivery & deadlines',          icon: '📦' },
      { key: 'ratingProfessionalism', label: 'Respect of specifications',     icon: '📋' },
    ],
    ECOMMERCE: [
      { key: 'ratingGlobal',          label: 'Overall satisfaction',          icon: '⭐' },
      { key: 'ratingCommunication',   label: 'Communication & support',       icon: '💬' },
      { key: 'ratingQuality',         label: 'Store quality & UX',            icon: '🛍️' },
      { key: 'ratingDeadline',        label: 'Delivery & deadlines',          icon: '📦' },
      { key: 'ratingProfessionalism', label: 'Technical requirements',        icon: '⚙️' },
    ],
    DESIGN_GRAPHISME: [
      { key: 'ratingGlobal',          label: 'Overall satisfaction',          icon: '⭐' },
      { key: 'ratingCommunication',   label: 'Communication & revisions',     icon: '💬' },
      { key: 'ratingQuality',         label: 'Creativity & originality',      icon: '🎨' },
      { key: 'ratingDeadline',        label: 'Delivery timeline',             icon: '⏱️' },
      { key: 'ratingProfessionalism', label: 'Brand guidelines respect',      icon: '🎯' },
    ],
    MARKETING: [
      { key: 'ratingGlobal',          label: 'Overall results',               icon: '⭐' },
      { key: 'ratingCommunication',   label: 'Reporting & communication',     icon: '📊' },
      { key: 'ratingQuality',         label: 'Strategy & execution',          icon: '💡' },
      { key: 'ratingDeadline',        label: 'Campaign timeline',             icon: '📅' },
      { key: 'ratingProfessionalism', label: 'Results & performance',         icon: '📈' },
    ],
    VIDEO: [
      { key: 'ratingGlobal',          label: 'Overall satisfaction',          icon: '⭐' },
      { key: 'ratingCommunication',   label: 'Communication & revisions',     icon: '💬' },
      { key: 'ratingQuality',         label: 'Video quality & editing',       icon: '🎬' },
      { key: 'ratingDeadline',        label: 'Delivery timeline',             icon: '⏱️' },
      { key: 'ratingProfessionalism', label: 'Respect of brief',              icon: '🎯' },
    ],
    FORMATION: [
      { key: 'ratingGlobal',          label: 'Overall experience',            icon: '⭐' },
      { key: 'ratingCommunication',   label: 'Clarity of explanations',       icon: '🗣️' },
      { key: 'ratingQuality',         label: 'Content quality & materials',   icon: '📚' },
      { key: 'ratingDeadline',        label: 'Punctuality',                   icon: '⏰' },
      { key: 'ratingProfessionalism', label: 'Trainer engagement',            icon: '🧠' },
    ],
  };

  private static readonly DEFAULT_CRITERIA = [
    { key: 'ratingGlobal',          label: 'Overall rating',    icon: '⭐' },
    { key: 'ratingCommunication',   label: 'Communication',     icon: '💬' },
    { key: 'ratingQuality',         label: 'Work quality',      icon: '🎯' },
    { key: 'ratingDeadline',        label: 'Deadline respect',  icon: '⏱️' },
    { key: 'ratingProfessionalism', label: 'Professionalism',   icon: '🏆' },
  ];

  get criteria() {
    return FeedbackFormComponent.CATEGORY_CRITERIA[this.projectCategory]
        ?? FeedbackFormComponent.DEFAULT_CRITERIA;
  }

  get categoryLabel(): string {
    const labels: Record<string, string> = {
      DEVELOPPEMENT_SPECIFIQUE: '🖥️ Software Development',
      APPLICATION_MOBILE:       '📱 Mobile App',
      SITE_WEB:                 '🌐 Web Design',
      ECOMMERCE:                '🛍️ E-Commerce',
      DESIGN_GRAPHISME:         '🎨 Graphic Design',
      MARKETING:                '📈 Marketing',
      VIDEO:                    '🎬 Video',
      FORMATION:                '📚 Training',
      AUTRE:                    '💼 General',
    };
    return labels[this.projectCategory] ?? '💼 General';
  }

  // ── Phrases AI par catégorie ──────────────────────────────────────────────

  private getCriteriaPhrases(): Record<string, Record<number, string>> {
    const comm = {
      5: 'Communication was outstanding — always responsive, clear, and proactive.',
      4: 'Communication was very good and kept me well informed at every stage.',
      3: 'Communication was acceptable but could have been more frequent.',
      2: 'Communication was lacking — responses were slow and updates insufficient.',
      1: 'Communication was very poor and caused significant issues.',
    };
    const deadline = {
      5: 'All deadlines were respected perfectly — delivery was on time or ahead of schedule.',
      4: 'Deadlines were mostly respected and the project delivered within the agreed timeframe.',
      3: 'Most deadlines were met but there were a few minor delays.',
      2: 'Deadlines were frequently missed and caused delays in the timeline.',
      1: 'Deadlines were not respected at all, causing major disruptions.',
    };
    const globalDefault = {
      5: 'The overall quality of the work was exceptional and fully exceeded my expectations.',
      4: 'The overall result was very good and met all the requirements I had set.',
      3: 'The overall result was satisfactory but there is still room for improvement.',
      2: 'The overall quality was below my expectations and needs significant improvement.',
      1: 'The overall result was very disappointing and did not meet the agreed requirements.',
    };

    const byCategory: Record<string, Record<string, Record<number, string>>> = {
      DEVELOPPEMENT_SPECIFIQUE: {
        ratingGlobal:          globalDefault,
        ratingCommunication:   comm,
        ratingQuality: {
          5: 'The code is clean, well-structured, and fully documented — a pleasure to review.',
          4: 'The code quality is very good with clear logic and minimal technical debt.',
          3: 'The code works but could benefit from refactoring and better documentation.',
          2: 'The code quality was poor with frequent bugs and insufficient comments.',
          1: 'The code was unacceptable — unreadable, untested, and not following any standards.',
        },
        ratingDeadline:        deadline,
        ratingProfessionalism: {
          5: 'Every specification was implemented exactly as agreed — nothing was overlooked.',
          4: 'Almost all specifications were respected with only minor deviations.',
          3: 'Most specs were followed but some features were missing or incomplete.',
          2: 'Several key specifications were ignored or incorrectly implemented.',
          1: 'The deliverable bore little resemblance to the agreed specifications.',
        },
      },
      APPLICATION_MOBILE: {
        ratingGlobal:          globalDefault,
        ratingCommunication:   comm,
        ratingQuality: {
          5: 'The app is smooth, bug-free, and delivers an excellent user experience.',
          4: 'The app quality is very good with strong performance and clean UI.',
          3: 'The app works but has some performance issues and UX improvements needed.',
          2: 'The app had significant bugs and a poor user experience.',
          1: 'The app was unusable and did not meet basic quality standards.',
        },
        ratingDeadline: deadline,
        ratingProfessionalism: {
          5: 'All mobile-specific requirements (platforms, gestures, notifications) were perfectly met.',
          4: 'Most technical requirements were implemented correctly and professionally.',
          3: 'Some technical requirements were partially met — improvements were needed.',
          2: 'Several technical requirements were missing or poorly implemented.',
          1: 'The technical requirements were largely ignored.',
        },
      },
      SITE_WEB: {
        ratingGlobal:          globalDefault,
        ratingCommunication:   comm,
        ratingQuality: {
          5: 'The website is visually stunning, fully responsive, and technically flawless.',
          4: 'The website quality is excellent with great design and solid development.',
          3: 'The website is functional but has some design and responsiveness issues.',
          2: 'The website quality was disappointing with layout and technical problems.',
          1: 'The website was far below expectations in both design and functionality.',
        },
        ratingDeadline: deadline,
        ratingProfessionalism: {
          5: 'All specifications (pages, features, integrations) were delivered exactly as agreed.',
          4: 'The specifications were largely respected with only minor gaps.',
          3: 'Most specs were met but some features were incomplete or missing.',
          2: 'Several specifications were not implemented as agreed.',
          1: 'The specifications were largely ignored.',
        },
      },
      ECOMMERCE: {
        ratingGlobal:          globalDefault,
        ratingCommunication:   comm,
        ratingQuality: {
          5: 'The store is beautifully designed, easy to navigate, and conversion-optimized.',
          4: 'The store quality is very good with a clean UX and solid product pages.',
          3: 'The store works but has some UX issues affecting the shopping experience.',
          2: 'The store UX was poor with confusing navigation and checkout issues.',
          1: 'The store was unusable and did not meet e-commerce standards.',
        },
        ratingDeadline: deadline,
        ratingProfessionalism: {
          5: 'All technical requirements (payments, shipping, inventory) were implemented perfectly.',
          4: 'Most technical integrations were implemented correctly and professionally.',
          3: 'Some technical requirements were partially met or need further work.',
          2: 'Several technical features were missing or malfunctioning.',
          1: 'The technical requirements were largely missing.',
        },
      },
      DESIGN_GRAPHISME: {
        ratingGlobal:          globalDefault,
        ratingCommunication:   comm,
        ratingQuality: {
          5: 'The creative direction was outstanding — original, on-brand, and visually striking.',
          4: 'The designs were creative, well-executed, and professionally delivered.',
          3: 'The designs were decent but lacked the expected originality and polish.',
          2: 'The creative quality was disappointing and did not meet the visual brief.',
          1: 'The designs were completely off-brief and required a total redo.',
        },
        ratingDeadline: deadline,
        ratingProfessionalism: {
          5: 'Every deliverable perfectly adhered to our brand guidelines and visual charter.',
          4: 'The brand guidelines were well respected throughout the project.',
          3: 'Brand guidelines were partially respected — some inconsistencies were noted.',
          2: 'The brand guidelines were frequently ignored, affecting brand consistency.',
          1: 'The brand guidelines were not respected at all.',
        },
      },
      MARKETING: {
        ratingGlobal: {
          5: 'The marketing results were exceptional — targets exceeded and ROI outstanding.',
          4: 'The campaign performed very well and delivered strong results overall.',
          3: 'Results were satisfactory but there is room for better targeting and execution.',
          2: 'The marketing results were below expectations and did not justify the investment.',
          1: 'The campaign completely failed to deliver any measurable results.',
        },
        ratingCommunication: {
          5: 'Reporting was excellent — detailed, timely, and fully transparent throughout.',
          4: 'Reporting was very good with regular updates and clear performance data.',
          3: 'Reporting was acceptable but could have been more detailed and frequent.',
          2: 'Reporting was insufficient — updates were rare and data was unclear.',
          1: 'There was almost no reporting and the campaign was a black box.',
        },
        ratingQuality: {
          5: 'The strategy was brilliant — well-targeted, creative, and perfectly executed.',
          4: 'The strategy and execution were strong with good targeting and messaging.',
          3: 'The strategy was decent but the execution lacked consistency and impact.',
          2: 'The strategy was weak and the execution was poorly done.',
          1: 'The marketing strategy and execution were completely inadequate.',
        },
        ratingDeadline: deadline,
        ratingProfessionalism: {
          5: 'The results far exceeded the agreed KPIs and delivered outstanding ROI.',
          4: 'Most KPIs were achieved and the performance was strong overall.',
          3: 'Some KPIs were met but performance was inconsistent across channels.',
          2: 'Most KPIs were not achieved and the performance was disappointing.',
          1: 'None of the agreed KPIs were met — a very poor outcome.',
        },
      },
      VIDEO: {
        ratingGlobal:          globalDefault,
        ratingCommunication:   comm,
        ratingQuality: {
          5: 'The video quality is stunning — perfect editing, color grading, and sound design.',
          4: 'The video is very well produced with professional editing and great pacing.',
          3: 'The video quality is acceptable but editing and transitions could be improved.',
          2: 'The video quality was disappointing with poor editing and sound issues.',
          1: 'The video was unprofessional and did not meet any quality standard.',
        },
        ratingDeadline: deadline,
        ratingProfessionalism: {
          5: 'The video perfectly matched the creative brief — tone, message, and visuals spot on.',
          4: 'The brief was well respected with only minor creative deviations.',
          3: 'The brief was partially followed but some key elements were missing.',
          2: 'The video deviated significantly from the agreed brief.',
          1: 'The creative brief was completely ignored.',
        },
      },
      FORMATION: {
        ratingGlobal: {
          5: 'An outstanding training experience — I learned more than expected and feel fully equipped.',
          4: 'The training was excellent and gave me a solid understanding of the subject.',
          3: 'The training was good overall but some topics needed more depth.',
          2: 'The training was below expectations — content was superficial and poorly structured.',
          1: 'The training was very disappointing and did not meet the learning objectives.',
        },
        ratingCommunication: {
          5: 'The explanations were crystal clear — complex concepts made simple and accessible.',
          4: 'Explanations were very clear and easy to follow throughout the sessions.',
          3: 'Explanations were generally clear but some concepts needed more examples.',
          2: 'Some explanations were confusing and hard to follow.',
          1: 'The explanations were unclear and made the learning experience very difficult.',
        },
        ratingQuality: {
          5: 'The training materials were excellent — comprehensive, well-organized, and highly useful.',
          4: 'The content and materials were very good and supported the learning well.',
          3: 'The materials were decent but could have been more detailed and structured.',
          2: 'The training materials were basic and insufficient for the level advertised.',
          1: 'The materials were completely inadequate and of very poor quality.',
        },
        ratingDeadline: {
          5: 'The trainer was always perfectly punctual — every session started and ended on time.',
          4: 'Punctuality was very good with only very minor delays.',
          3: 'Punctuality was generally acceptable but some sessions started late.',
          2: 'The trainer was frequently late, disrupting the training schedule.',
          1: 'The trainer had serious punctuality issues that undermined the training.',
        },
        ratingProfessionalism: {
          5: 'The trainer was passionate, engaging, and created an excellent learning environment.',
          4: 'The trainer was highly engaged and made the sessions dynamic and interesting.',
          3: 'The trainer was generally engaged but some sessions felt flat.',
          2: 'The trainer seemed disengaged and lacked enthusiasm.',
          1: 'The trainer showed no engagement and the sessions were tedious.',
        },
      },
    };

    return byCategory[this.projectCategory] ?? {
      ratingGlobal: globalDefault,
      ratingCommunication: comm,
      ratingQuality: {
        5: 'The quality of the deliverables was excellent — every detail was handled with great care.',
        4: 'The work quality was very high and all deliverables were well-crafted and professional.',
        3: 'The quality of the work was adequate but some areas could have been more polished.',
        2: 'The quality of the deliverables was disappointing and fell short of what was agreed.',
        1: 'The quality of the work was unacceptable and required major revisions.',
      },
      ratingDeadline: deadline,
      ratingProfessionalism: {
        5: 'The level of professionalism was outstanding — truly a pleasure to work with.',
        4: 'The freelancer demonstrated a high level of professionalism throughout the collaboration.',
        3: 'Professionalism was generally good but there were a few areas that could be improved.',
        2: 'The level of professionalism was below expectations and impacted the working relationship.',
        1: 'Professionalism was very poor and made the collaboration very difficult.',
      },
    };
  }

  readonly emojiGroups = [
    { label: 'Positive', emojis: ['😊','😄','🎉','👍','✅','⭐','🔥','💯','🙏','👏','💪','✨'] },
    { label: 'Neutral',  emojis: ['🤔','😐','💬','📝','📌','🔎','💡','⚡','🛠️','📊','🎯','📋'] },
    { label: 'Negative', emojis: ['😟','👎','❌','⚠️','😕','🐌','💔','😤','🔴','😞','🚫','⏰'] },
  ];

  constructor(
    private fb: FormBuilder,
    private feedbackService: FeedbackService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      ratingGlobal:          [0, [Validators.required, Validators.min(1), Validators.max(5)]],
      ratingCommunication:   [0, [Validators.required, Validators.min(1), Validators.max(5)]],
      ratingQuality:         [0, [Validators.required, Validators.min(1), Validators.max(5)]],
      ratingDeadline:        [0, [Validators.required, Validators.min(1), Validators.max(5)]],
      ratingProfessionalism: [0, [Validators.required, Validators.min(1), Validators.max(5)]],
      comment:               ['', [Validators.required, Validators.minLength(20), Validators.maxLength(2000)]],
      recommend:             [null, Validators.required],
    });
  }

  private refreshSuggestions(): void {
    const phrases = this.getCriteriaPhrases();
    const suggestions: string[] = [];
    for (const key of Object.keys(phrases)) {
      const rating: number = this.form.get(key)?.value || 0;
      if (rating >= 1 && rating <= 5) {
        suggestions.push(phrases[key][rating]);
      }
    }
    this.suggestions = suggestions;
    this.summary = this.buildSummary();
  }

  private buildSummary(): string {
    const keys = ['ratingGlobal', 'ratingCommunication', 'ratingQuality', 'ratingDeadline', 'ratingProfessionalism'];
    const values = keys.map(k => this.form.get(k)?.value || 0).filter(v => v >= 1);
    if (values.length === 0) return '';

    const avg = values.reduce((a, b) => a + b, 0) / values.length;

    const criteriaNames: Record<string, string> = {
      ratingCommunication:   'communication',
      ratingQuality:         'work quality',
      ratingDeadline:        'deadline management',
      ratingProfessionalism: 'professionalism',
    };

    const strengths  = Object.entries(criteriaNames).filter(([k]) => (this.form.get(k)?.value || 0) >= 4).map(([, v]) => v);
    const weaknesses = Object.entries(criteriaNames).filter(([k]) => { const r = this.form.get(k)?.value || 0; return r >= 1 && r <= 2; }).map(([, v]) => v);

    if (avg >= 4.0) {
      let s = 'Overall, this was an excellent collaboration that fully met my expectations.';
      if (strengths.length) s += ` The freelancer particularly excelled in ${strengths.join(', ')}.`;
      s += ' I would highly recommend this freelancer and look forward to working together again.';
      return s;
    } else if (avg >= 3.0) {
      let s = 'Overall, this was a good collaboration with some room for improvement.';
      if (strengths.length)  s += ` Strong points included ${strengths.join(', ')}.`;
      if (weaknesses.length) s += ` However, ${weaknesses.join(' and ')} could be improved in future projects.`;
      return s;
    } else if (avg >= 2.0) {
      let s = 'Overall, this collaboration was below expectations.';
      if (strengths.length)  s += ` Some positive aspects included ${strengths.join(', ')}.`;
      if (weaknesses.length) s += ` Unfortunately, ${weaknesses.join(' and ')} were particularly disappointing and need significant improvement.`;
      else s += ' Several areas require significant improvement.';
      return s;
    } else {
      let s = 'Overall, this was a very disappointing experience that did not meet the agreed standards.';
      if (weaknesses.length) s += ` Serious issues were identified with ${weaknesses.join(', ')}.`;
      s += ' Substantial improvements are needed before taking on future projects.';
      return s;
    }
  }

  applySuggestion(phrase: string): void {
    const ctrl = this.form.get('comment')!;
    const current: string = ctrl.value || '';
    const separator = current.trim().length > 0 ? ' ' : '';
    ctrl.setValue(current + separator + phrase);
    ctrl.markAsTouched();
  }

  insertEmoji(emoji: string): void {
    const el = this.commentArea?.nativeElement;
    const ctrl = this.form.get('comment')!;
    if (el) {
      const start = el.selectionStart ?? 0;
      const end   = el.selectionEnd   ?? 0;
      const val: string = ctrl.value || '';
      ctrl.setValue(val.slice(0, start) + emoji + val.slice(end));
      setTimeout(() => {
        el.selectionStart = el.selectionEnd = start + emoji.length;
        el.focus();
      });
    } else {
      ctrl.setValue((ctrl.value || '') + emoji);
    }
    this.showEmojiPicker = false;
  }

  setRating(key: string, value: number): void {
    this.form.get(key)?.setValue(value);
    this.form.get(key)?.markAsTouched();
    this.refreshSuggestions();
  }

  get commentLength(): number {
    return this.form.get('comment')?.value?.length || 0;
  }

  get isValid(): boolean {
    return this.form.valid && this.allRatingsSet;
  }

  get allRatingsSet(): boolean {
    return this.criteria.every(c => (this.form.get(c.key)?.value || 0) >= 1);
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files) return;
    this.uploadError = null;

    for (const file of Array.from(input.files)) {
      if (!this.ALLOWED_TYPES.includes(file.type)) {
        this.uploadError = `Unsupported type: ${file.name}. Allowed: PNG, JPG, GIF, MP4.`;
        continue;
      }
      if (file.size > this.MAX_SIZE_MB * 1024 * 1024) {
        this.uploadError = `${file.name} exceeds ${this.MAX_SIZE_MB} MB limit.`;
        continue;
      }
      if (this.pendingFiles.length >= this.MAX_FILES) {
        this.uploadError = `Max ${this.MAX_FILES} files allowed.`;
        break;
      }
      this.pendingFiles.push(file);
    }
    input.value = '';
  }

  removeFile(index: number): void {
    this.pendingFiles.splice(index, 1);
  }

  removeUploaded(index: number): void {
    this.uploadedUrls.splice(index, 1);
  }

  isImage(url: string): boolean {
    return /\.(png|jpe?g|gif)$/i.test(url);
  }

  isVideo(url: string): boolean {
    return /\.mp4$/i.test(url);
  }

  private uploadAllPending(): Promise<void> {
    if (this.pendingFiles.length === 0) return Promise.resolve();
    this.uploadingFiles = true;
    const uploads = this.pendingFiles.map(f => this.feedbackService.uploadMedia(f));
    return new Promise((resolve, reject) => {
      forkJoin(uploads).pipe(finalize(() => this.uploadingFiles = false)).subscribe({
        next: (results) => {
          this.uploadedUrls.push(...results.map(r => r.url));
          this.pendingFiles = [];
          resolve();
        },
        error: (err) => {
          this.uploadError = err?.error?.error || 'File upload failed.';
          reject(err);
        }
      });
    });
  }

  retryComment(): void {
    this.isSpamChoice = false;
    this.isSpamError  = false;
    this.error        = null;
  }

  requestReview(): void {
    this.requestingReview = true;
    const payload = {
      ...this.form.value,
      clientEmail: this.authService.getUserEmail() || '',
      attachments: this.uploadedUrls.length ? this.uploadedUrls : undefined,
    };
    this.feedbackService.requestReview(this.offerId, payload).pipe(
      finalize(() => this.requestingReview = false)
    ).subscribe({
      next: () => {
        this.isSpamChoice    = false;
        this.isPendingReview = true;
        this.error           = null;
      },
      error: (err) => {
        this.error = err?.error?.error || 'Error submitting for review.';
      }
    });
  }

  onSubmit(): void {
    if (!this.isValid || this.submitting) return;
    this.submitting = true;
    this.error = null;
    this.isSpamChoice = false;

    this.uploadAllPending().then(() => {
      const payload = {
        ...this.form.value,
        clientEmail: this.authService.getUserEmail() || '',
        attachments: this.uploadedUrls.length ? this.uploadedUrls : undefined,
      };

      this.feedbackService.createFeedback(this.offerId, payload).pipe(
        finalize(() => this.submitting = false)
      ).subscribe({
        next: (fb) => this.submitted.emit(fb),
        error: (err) => {
          const type = err?.error?.type;
          if (err?.status === 422 && type === 'SPAM_DETECTED') {
            this.isSpamChoice = true;
            this.isSpamError  = false;
          } else {
            this.isSpamChoice = false;
            this.isSpamError  = false;
          }
          this.error = err?.error?.error || 'Error submitting feedback.';
        }
      });
    }).catch(() => {
      this.submitting = false;
    });
  }
}
