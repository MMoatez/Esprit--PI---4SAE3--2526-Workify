import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { FeedbackNotificationService, FeedbackToast } from '../../services/feedback-notification.service';

@Component({
  selector: 'app-feedback-notification-toast',
  standalone: false,
  template: `
    <div class="fnt-stack" *ngIf="toasts.length > 0">
      <div *ngFor="let t of toasts; trackBy: trackById"
           class="fnt-toast"
           [class.fnt-toast--feedback]="t.type === 'FEEDBACK_RECEIVED'"
           [class.fnt-toast--response]="t.type === 'RESPONSE_RECEIVED'"
           [class.fnt-toast--eval]="t.type === 'EVALUATION_PENDING' || t.type === 'EVALUATION_REMINDER'">
        <span class="fnt-icon">{{ t.icon }}</span>
        <div class="fnt-body">
          <p class="fnt-title">{{ t.title }}</p>
          <p class="fnt-msg">{{ t.message }}</p>
        </div>
        <button class="fnt-close" (click)="svc.dismiss(t.id)">&times;</button>
      </div>
    </div>
  `,
  styles: [`
    .fnt-stack {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 99998;
      display: flex;
      flex-direction: column;
      gap: 10px;
      max-width: 340px;
    }
    .fnt-toast {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      background: #fff;
      border-radius: 12px;
      padding: 14px 16px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.13);
      border-left: 4px solid #6366f1;
      animation: fnt-in .25s ease;
    }
    .fnt-toast--feedback  { border-left-color: #10b981; }
    .fnt-toast--response  { border-left-color: #3b82f6; }
    .fnt-toast--eval      { border-left-color: #f59e0b; }
    .fnt-icon { font-size: 20px; flex-shrink: 0; margin-top: 1px; }
    .fnt-body { flex: 1; }
    .fnt-title { font-weight: 600; font-size: 13px; color: #1e293b; margin: 0 0 3px; }
    .fnt-msg   { font-size: 12px; color: #475569; margin: 0; line-height: 1.4; }
    .fnt-close {
      background: none; border: none; cursor: pointer;
      color: #94a3b8; font-size: 18px; line-height: 1;
      padding: 0; flex-shrink: 0;
    }
    .fnt-close:hover { color: #475569; }
    @keyframes fnt-in {
      from { opacity: 0; transform: translateY(10px); }
      to   { opacity: 1; transform: translateY(0); }
    }
  `]
})
export class FeedbackNotificationToastComponent implements OnInit, OnDestroy {

  toasts: FeedbackToast[] = [];
  private destroy$ = new Subject<void>();

  constructor(public svc: FeedbackNotificationService) {}

  ngOnInit(): void {
    this.svc.toasts$.pipe(takeUntil(this.destroy$)).subscribe(t => this.toasts = t);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  trackById(_: number, t: FeedbackToast): string { return t.id; }
}
