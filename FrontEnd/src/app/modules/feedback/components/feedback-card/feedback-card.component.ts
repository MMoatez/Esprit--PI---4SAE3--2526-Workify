import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { Subscription, interval } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { FeedbackDto, FeedbackUpdateRequest } from '../../../../core/models/feedback.model';
import { AuthService } from '../../../../core/services/auth.service';
import { FeedbackService } from '../../../../core/services/feedback.service';
import { TranslationService } from '../../../../core/services/translation.service';

@Component({
  standalone: false,
  selector: 'app-feedback-card',
  templateUrl: './feedback-card.component.html',
  styleUrls: ['./feedback-card.component.css']
})
export class FeedbackCardComponent implements OnInit, OnDestroy {

  @Input() feedback!: FeedbackDto;
  @Input() freelancerId!: number;
  @Output() feedbackUpdated = new EventEmitter<FeedbackDto>();
  @Output() feedbackDeleted = new EventEmitter<void>();

  private aiPollSub?: Subscription;
  private aiStompClient?: Client;

  showResponseForm = false;

  // Edit state
  isEditMode = false;
  editRatings: { [key: string]: number } = {};
  editComment = '';
  editRecommend: boolean | null = null;
  submittingEdit = false;
  editError: string | null = null;

  // Delete state
  confirmingDelete = false;
  submittingDelete = false;

  // Response edit state
  isEditResponseMode = false;
  editResponseContent = '';
  submittingEditResponse = false;
  editResponseError: string | null = null;

  // Response delete state
  confirmingDeleteResponse = false;
  submittingDeleteResponse = false;

  // Translation state
  translating = false;
  translationError: string | null = null;
  translatedComment: string | null = null;
  showingTranslation = false;
  selectedLang = '';

  readonly supportedLanguages = [
    { code: 'en', label: '🇬🇧 English' },
    { code: 'fr', label: '🇫🇷 French' },
    { code: 'ar', label: '🇸🇦 Arabic' },
    { code: 'es', label: '🇪🇸 Spanish' },
    { code: 'de', label: '🇩🇪 German' },
    { code: 'it', label: '🇮🇹 Italian' },
    { code: 'pt', label: '🇵🇹 Portuguese' },
    { code: 'zh', label: '🇨🇳 Chinese' },
    { code: 'ru', label: '🇷🇺 Russian' },
    { code: 'tr', label: '🇹🇷 Turkish' },
    { code: 'nl', label: '🇳🇱 Dutch' },
    { code: 'ko', label: '🇰🇷 Korean' },
    { code: 'ja', label: '🇯🇵 Japanese' },
    { code: 'hi', label: '🇮🇳 Hindi' },
  ];

  readonly subCriteria = [
    { key: 'ratingCommunication',   label: 'Communication' },
    { key: 'ratingQuality',         label: 'Quality' },
    { key: 'ratingDeadline',        label: 'Deadlines' },
    { key: 'ratingProfessionalism', label: 'Professionalism' },
  ];

  readonly allCriteria = [
    { key: 'ratingGlobal',          label: 'Overall rating' },
    { key: 'ratingCommunication',   label: 'Communication' },
    { key: 'ratingQuality',         label: 'Work quality' },
    { key: 'ratingDeadline',        label: 'Deadline respect' },
    { key: 'ratingProfessionalism', label: 'Professionalism' },
  ];

  constructor(
    public authService: AuthService,
    private feedbackService: FeedbackService,
    public translationService: TranslationService
  ) {}

  ngOnInit(): void {
    const browserLang = this.translationService.browserLang;
    const preferred = this.supportedLanguages.find(l => l.code === browserLang)
      || this.supportedLanguages.find(l => l.code === 'en')!;
    this.selectedLang = preferred.code;
    this.startAiPollingIfNeeded();
  }


  ngOnDestroy(): void {
    this.aiPollSub?.unsubscribe();
    this.aiStompClient?.deactivate();
  }

  aiAnalyzing = false;

  private startAiPollingIfNeeded(): void {
    this.connectAiWebSocket();
  }

  private connectAiWebSocket(): void {
    if (this.feedback.aiSentiment) return;

    this.aiAnalyzing = true;

    this.aiStompClient = new Client({
      webSocketFactory: () => new SockJS('http://localhost:8086/ws-feedback'),
      reconnectDelay: 0,
      onConnect: () => {
        this.aiStompClient!.subscribe(
          `/topic/feedback-${this.feedback.id}-ai-ready`,
          (msg) => {
            const data = JSON.parse(msg.body);
            this.feedback = {
              ...this.feedback,
              aiSentiment:      data.aiSentiment      || undefined,
              aiSentimentScore: data.aiSentimentScore || undefined,
              aiTone:           data.aiTone           || undefined,
              aiThemes:         data.aiThemes         || undefined,
            };
            this.aiAnalyzing = false;
            this.aiStompClient?.deactivate();
            this.aiPollSub?.unsubscribe();
          }
        );
      },
      onStompError:    () => this.startFallbackPolling(),
      onWebSocketError: () => this.startFallbackPolling(),
    });

    this.aiStompClient.activate();
    // Also start polling as backup in case WS fails or message was already sent
    this.startFallbackPolling();
  }

  private startFallbackPolling(): void {
    if (this.aiPollSub) return; // already polling

    // Immediate check — analysis may have already finished before WS subscribed
    this.feedbackService.getFeedbackById(this.feedback.id).subscribe({
      next: (updated) => {
        this.feedback = { ...this.feedback, ...updated };
        if (updated.aiSentiment) {
          this.aiAnalyzing = false;
          this.aiStompClient?.deactivate();
          return;
        }
        // Not ready yet — poll every 3s (max 1 min)
        let attempts = 0;
        this.aiPollSub = interval(3000)
          .pipe(switchMap(() => this.feedbackService.getFeedbackById(this.feedback.id)))
          .subscribe({
            next: (polled) => {
              this.feedback = polled;
              attempts++;
              if (polled.aiSentiment) {
                this.aiAnalyzing = false;
                this.aiPollSub?.unsubscribe();
                this.aiStompClient?.deactivate();
              } else if (attempts >= 20) { // 20 × 3s = 1 min max
                this.aiAnalyzing = false;
                this.aiPollSub?.unsubscribe();
              }
            },
            error: () => {
              this.aiAnalyzing = false;
              this.aiPollSub?.unsubscribe();
            }
          });
      },
      error: () => {
        // If immediate check fails, still try polling rather than freezing
        let attempts = 0;
        this.aiPollSub = interval(3000)
          .pipe(switchMap(() => this.feedbackService.getFeedbackById(this.feedback.id)))
          .subscribe({
            next: (polled) => {
              this.feedback = polled;
              attempts++;
              if (polled.aiSentiment) {
                this.aiAnalyzing = false;
                this.aiPollSub?.unsubscribe();
                this.aiStompClient?.deactivate();
              } else if (attempts >= 20) {
                this.aiAnalyzing = false;
                this.aiPollSub?.unsubscribe();
              }
            },
            error: () => {
              this.aiAnalyzing = false;
              this.aiPollSub?.unsubscribe();
            }
          });
      }
    });
  }

  get isClient(): boolean {
    return this.authService.getCurrentRole() === 'client';
  }

  get isFreelancer(): boolean {
    return this.authService.getCurrentRole() === 'freelancer';
  }

  get canRespond(): boolean {
    return this.isFreelancer
        && !this.feedback.locked
        && !this.feedback.response
        && !this.feedback.deleted;
  }

  get canEditResponse(): boolean {
    return this.isFreelancer
        && !!this.feedback.response
        && !this.feedback.response!.deleted;
  }

  get canDeleteResponse(): boolean {
    return this.canEditResponse;
  }

  get canEdit(): boolean {
    return this.isClient && !this.feedback.locked && !this.feedback.deleted;
  }

  get canDelete(): boolean {
    return this.isClient && !this.feedback.locked && !this.feedback.deleted;
  }

  get editValid(): boolean {
    return this.allCriteria.every(c => (this.editRatings[c.key] || 0) >= 1)
        && this.editComment.trim().length >= 20
        && this.editRecommend !== null;
  }

  startEdit(): void {
    this.editRatings = {
      ratingGlobal:          this.feedback.ratingGlobal,
      ratingCommunication:   this.feedback.ratingCommunication,
      ratingQuality:         this.feedback.ratingQuality,
      ratingDeadline:        this.feedback.ratingDeadline,
      ratingProfessionalism: this.feedback.ratingProfessionalism,
    };
    this.editComment   = this.feedback.comment;
    this.editRecommend = this.feedback.recommend;
    this.editError     = null;
    this.isEditMode    = true;
  }

  cancelEdit(): void {
    this.isEditMode = false;
    this.editError  = null;
  }

  submitEdit(): void {
    if (!this.editValid || this.submittingEdit) return;
    this.submittingEdit = true;
    this.editError      = null;

    const req: FeedbackUpdateRequest = {
      ratingGlobal:          this.editRatings['ratingGlobal'],
      ratingCommunication:   this.editRatings['ratingCommunication'],
      ratingQuality:         this.editRatings['ratingQuality'],
      ratingDeadline:        this.editRatings['ratingDeadline'],
      ratingProfessionalism: this.editRatings['ratingProfessionalism'],
      comment:               this.editComment.trim(),
      recommend:             this.editRecommend!,
    };

    this.feedbackService.updateFeedback(
      this.feedback.id, req, this.authService.getUserEmail() || ''
    ).subscribe({
      next: (updated) => {
        this.feedback       = updated;
        this.isEditMode     = false;
        this.submittingEdit = false;
        this.feedbackUpdated.emit(updated);
        // The backend returns the DTO with AI fields already set (computed synchronously).
        // Clean up any stale WS/polling from before the edit and stay idle.
        this.aiStompClient?.deactivate();
        this.aiPollSub?.unsubscribe();
        this.aiStompClient = undefined;
        this.aiPollSub     = undefined;
        this.aiAnalyzing   = false;
      },
      error: (err) => {
        this.editError      = err?.error?.error || 'Error updating.';
        this.submittingEdit = false;
      }
    });
  }

  requestDelete(): void {
    this.confirmingDelete = true;
  }

  cancelDelete(): void {
    this.confirmingDelete = false;
  }

  submitDelete(): void {
    if (this.submittingDelete) return;
    this.submittingDelete = true;

    this.feedbackService.deleteFeedback(
      this.feedback.id, this.authService.getUserEmail() || ''
    ).subscribe({
      next: () => {
        this.submittingDelete = false;
        this.feedbackDeleted.emit();
      },
      error: () => { this.submittingDelete = false; }
    });
  }

  // ── Réponse : Modifier ───────────────────────────────────
  startEditResponse(): void {
    this.editResponseContent = this.feedback.response!.content;
    this.editResponseError   = null;
    this.isEditResponseMode  = true;
  }

  cancelEditResponse(): void {
    this.isEditResponseMode = false;
    this.editResponseError  = null;
  }

  submitEditResponse(): void {
    if (this.editResponseContent.trim().length < 10 || this.submittingEditResponse) return;
    this.submittingEditResponse = true;
    this.editResponseError      = null;

    this.feedbackService.updateResponse(this.feedback.response!.id, {
      content:      this.editResponseContent.trim(),
      freelancerId: this.feedback.freelancerId,
    }).subscribe({
      next: (updated) => {
        this.feedback            = { ...this.feedback, response: updated };
        this.isEditResponseMode  = false;
        this.submittingEditResponse = false;
        this.feedbackUpdated.emit(this.feedback);
      },
      error: (err) => {
        this.editResponseError      = err?.error?.error || 'Error updating reply.';
        this.submittingEditResponse = false;
      }
    });
  }

  // ── Réponse : Supprimer ──────────────────────────────────
  requestDeleteResponse(): void {
    this.confirmingDeleteResponse = true;
  }

  cancelDeleteResponse(): void {
    this.confirmingDeleteResponse = false;
  }

  deleteResponseError: string | null = null;

  submitDeleteResponse(): void {
    if (this.submittingDeleteResponse) return;
    this.submittingDeleteResponse = true;
    this.deleteResponseError = null;

    this.feedbackService.deleteResponse(
      this.feedback.response!.id, this.feedback.freelancerId
    ).subscribe({
      next: () => {
        this.feedback = {
          ...this.feedback,
          response: undefined,
          locked:   false,
        };
        this.confirmingDeleteResponse = false;
        this.submittingDeleteResponse = false;
        this.feedbackUpdated.emit(this.feedback);
      },
      error: (err) => {
        this.submittingDeleteResponse = false;
        this.deleteResponseError = err?.error?.message || err?.message || 'Delete error';
        console.error('[DELETE RESPONSE ERROR]', err);
      }
    });
  }

  onResponseSubmitted(): void {
    this.showResponseForm = false;
    this.feedbackService.getFeedbackById(this.feedback.id).subscribe(updated => {
      this.feedback = updated;
      this.feedbackUpdated.emit(updated);
    });
  }

  get computedGlobal(): number {
    return Math.round(
      (this.feedback.ratingCommunication + this.feedback.ratingQuality +
       this.feedback.ratingDeadline + this.feedback.ratingProfessionalism) / 4
    );
  }

  getRating(key: string): number {
    return (this.feedback as any)[key] ?? 0;
  }

  getBarWidth(value: number): string {
    return `${(value / 5) * 100}%`;
  }

  isImage(url: string): boolean {
    return /\.(png|jpe?g|gif)$/i.test(url);
  }

  isVideo(url: string): boolean {
    return /\.mp4$/i.test(url);
  }

  getAttachmentUrl(url: string): string {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return url.startsWith('/') ? url : '/' + url;
  }

  // ── Translation ───────────────────────────────────────────────────────────

  get canTranslate(): boolean {
    return !!this.feedback.comment;
  }

  get availableLanguages() {
    return this.supportedLanguages;
  }

  get displayedComment(): string {
    return (this.showingTranslation && this.translatedComment)
      ? this.translatedComment
      : this.feedback.comment;
  }

  translate(): void {
    // If already translated to the same lang, just toggle display
    if (this.translatedComment && this._lastTranslatedLang === this.selectedLang) {
      this.showingTranslation = !this.showingTranslation;
      return;
    }
    this.translating = true;
    this.translationError = null;
    this.translatedComment = null;
    this.translationService.translate(this.feedback.id, this.selectedLang)
      .subscribe({
        next: (dto) => {
          this.translatedComment     = dto.translatedComment;
          this._lastTranslatedLang   = this.selectedLang;
          this.showingTranslation    = true;
          this.translating           = false;
        },
        error: () => {
          this.translationError = 'Translation unavailable. Please try again later.';
          this.translating      = false;
        }
      });
  }

  _lastTranslatedLang = '';

  showOriginal(): void {
    this.showingTranslation = false;
  }
}
