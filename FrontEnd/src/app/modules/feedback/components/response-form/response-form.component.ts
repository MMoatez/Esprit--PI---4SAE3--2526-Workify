import { Component, Input, Output, EventEmitter, OnInit, ElementRef, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FeedbackService } from '../../../../core/services/feedback.service';
import { ResponseFeedbackDto } from '../../../../core/models/feedback.model';
import { finalize, forkJoin } from 'rxjs';

@Component({
  standalone: false,
  selector: 'app-response-form',
  templateUrl: './response-form.component.html',
  styleUrls: ['./response-form.component.css']
})
export class ResponseFormComponent implements OnInit {

  @Input() feedbackId!: number;
  @Input() freelancerId!: number;
  @Input() feedbackRatings: {
    ratingGlobal: number;
    ratingCommunication: number;
    ratingQuality: number;
    ratingDeadline: number;
    ratingProfessionalism: number;
  } | null = null;
  @Output() submitted = new EventEmitter<ResponseFeedbackDto>();
  @Output() cancelled = new EventEmitter<void>();

  @ViewChild('contentArea') contentArea!: ElementRef<HTMLTextAreaElement>;
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  form!: FormGroup;
  submitting = false;
  error: string | null = null;
  isSpamError = false;

  // AI suggestions (generated from client's ratings)
  suggestions: string[] = [];

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

  private readonly REPLY_PHRASES: Record<string, { high: string; medium: string; low: string }> = {
    ratingGlobal: {
      high:   'Thank you for the positive overall evaluation — it motivates me to keep delivering excellent work.',
      medium: 'Thank you for your honest overall evaluation — I will use this feedback to improve my future projects.',
      low:    'I am sorry the overall result did not meet your expectations — I am fully committed to doing better.'
    },
    ratingCommunication: {
      high:   'I am glad our communication worked well — keeping clients fully informed is a priority for me.',
      medium: 'I acknowledge that communication could have been more consistent and will improve on that.',
      low:    'I sincerely apologize for the communication gaps and will ensure much better responsiveness in future projects.'
    },
    ratingQuality: {
      high:   'I am pleased the work quality met your expectations — attention to detail is something I take very seriously.',
      medium: 'I appreciate your feedback on quality and will focus on delivering more polished work in the future.',
      low:    'I understand the quality did not meet your expectations and I take this feedback very seriously to improve.'
    },
    ratingDeadline: {
      high:   'I am glad I was able to deliver on time — respecting deadlines is a core commitment for me.',
      medium: 'I acknowledge there were some delays and I will improve my time management for future projects.',
      low:    'I sincerely apologize for missing the deadlines — this is not my standard and I will do much better.'
    },
    ratingProfessionalism: {
      high:   'Thank you for recognizing my professionalism — I always strive to maintain the highest standards.',
      medium: 'I will work on improving my overall professionalism and communication style in future collaborations.',
      low:    'I take your feedback on professionalism very seriously and will make significant improvements going forward.'
    }
  };
  readonly emojiGroups = [
    { label: 'Positive', emojis: ['😊','😄','🎉','👍','✅','⭐','🔥','💯','🙏','👏','💪','✨'] },
    { label: 'Neutral',  emojis: ['🤔','😐','💬','📝','📌','🔎','💡','⚡','🛠️','📊','🎯','📋'] },
    { label: 'Negative', emojis: ['😟','👎','❌','⚠️','😕','🐌','💔','😤','🔴','😞','🚫','⏰'] },
  ];

  constructor(private fb: FormBuilder, private feedbackService: FeedbackService) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      content: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(1000)]]
    });
    this.generateReplySuggestions();
  }

  private level(rating: number): 'high' | 'medium' | 'low' {
    if (rating >= 4) return 'high';
    if (rating === 3) return 'medium';
    return 'low';
  }

  private generateReplySuggestions(): void {
    if (!this.feedbackRatings) return;
    const phrases: string[] = [];
    for (const key of Object.keys(this.REPLY_PHRASES)) {
      const rating = (this.feedbackRatings as any)[key] || 0;
      if (rating >= 1) {
        phrases.push(this.REPLY_PHRASES[key][this.level(rating)]);
      }
    }
    this.suggestions = phrases;
  }

  applySuggestion(phrase: string): void {
    const ctrl = this.form.get('content')!;
    const current: string = ctrl.value || '';
    const separator = current.trim().length > 0 ? ' ' : '';
    ctrl.setValue(current + separator + phrase);
    ctrl.markAsTouched();
  }

  insertEmoji(emoji: string): void {
    const el = this.contentArea?.nativeElement;
    const ctrl = this.form.get('content')!;
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

  get contentLength(): number {
    return this.form.get('content')?.value?.length || 0;
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files) return;
    this.uploadError = null;

    for (const file of Array.from(input.files)) {
      if (!this.ALLOWED_TYPES.includes(file.type)) {
        this.uploadError = `Unsupported type: ${file.name}.`;
        continue;
      }
      if (file.size > this.MAX_SIZE_MB * 1024 * 1024) {
        this.uploadError = `${file.name} exceeds ${this.MAX_SIZE_MB} MB.`;
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

  removeFile(index: number): void { this.pendingFiles.splice(index, 1); }
  removeUploaded(index: number): void { this.uploadedUrls.splice(index, 1); }
  isImage(url: string): boolean { return /\.(png|jpe?g|gif)$/i.test(url); }
  isVideo(url: string): boolean { return /\.mp4$/i.test(url); }

  private uploadAllPending(): Promise<void> {
    if (this.pendingFiles.length === 0) return Promise.resolve();
    this.uploadingFiles = true;
    return new Promise((resolve, reject) => {
      forkJoin(this.pendingFiles.map(f => this.feedbackService.uploadMedia(f)))
        .pipe(finalize(() => this.uploadingFiles = false))
        .subscribe({
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

  onSubmit(): void {
    if (this.form.invalid || this.submitting) return;
    this.submitting = true;
    this.error = null;

    this.uploadAllPending().then(() => {
      this.feedbackService.createResponse(this.feedbackId, {
        content: this.form.value.content,
        freelancerId: this.freelancerId,
        attachments: this.uploadedUrls.length ? this.uploadedUrls : undefined,
      }).pipe(finalize(() => this.submitting = false)).subscribe({
        next: (r) => this.submitted.emit(r),
        error: (err) => {
          this.isSpamError = err?.status === 422 && err?.error?.type === 'SPAM_DETECTED';
          this.error = err?.error?.error || 'Error sending reply.';
        }
      });
    }).catch(() => {
      this.submitting = false;
    });
  }
}
