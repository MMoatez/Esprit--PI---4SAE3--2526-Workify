import { Injectable, NgZone } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { MessagingStateService } from './messaging-state.service';
import { AuthService } from './auth.service';
import { UserProfileService } from './user-profile.service';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/** Shape returned by POST /api/notifications/login-scan and the SSE "reminder" event. */
export interface ReminderPayload {
  conversationId : number;
  targetUserId?  : number;
  senderId?      : number;
  elapsedMinutes : number;
  elapsedLabel   : string;
  priority       : 'HIGH' | 'MEDIUM' | 'LOW';
  type           : string;  // "reminder" | "login_reminder" | "archive_notice"
  message        : string;
}

/** Data needed to render one toast notification. */
export interface NotificationToast {
  id             : string;
  conversationId : number;
  senderId?      : number;
  senderName     : string;
  elapsedLabel   : string;
  priority       : 'HIGH' | 'MEDIUM' | 'LOW';
  type           : string;
  message        : string;  // final display text (sender name resolved)
  createdAt      : Date;
}

// ─────────────────────────────────────────────────────────────────────────────
// Service
// ─────────────────────────────────────────────────────────────────────────────

/**
 * PriorityNotificationService
 * ───────────────────────────
 * Orchestrates the Dynamic Conversation Priority & Auto-Archive notification flow:
 *
 *  1. connect(userId)       — opens the SSE channel; reconnects automatically on drop.
 *  2. triggerLoginScan(uid) — calls POST /login-scan after login; shows all pending toasts.
 *  3. handleReminder(p)     — builds a toast from a ReminderPayload + updates state.
 *  4. addToast / dismiss    — managed queue (max 5) with 6-second auto-dismiss.
 *
 * Rate-limiting: same conversationId cannot show a toast twice within DEBOUNCE_MS.
 * The backend also debounces at the SSE layer (2 min), so protection is double-layered.
 */
@Injectable({ providedIn: 'root' })
export class PriorityNotificationService {

  // ── Toast state ────────────────────────────────────────────────────
  private readonly toastsSubject = new BehaviorSubject<NotificationToast[]>([]);
  readonly toasts$ = this.toastsSubject.asObservable();

  // ── SSE ────────────────────────────────────────────────────────────
  private eventSource   : EventSource | null = null;
  private connectedUser : number | null      = null;
  private sseRetryCount : number             = 0;
  private readonly SSE_MAX_RETRIES           = 3;

  // ── Client-side debounce ───────────────────────────────────────────
  /** conversationId → timestamp of last shown toast */
  private readonly shownAt   = new Map<number, number>();
  private readonly DEBOUNCE_MS = 2 * 60 * 1000; // 2 minutes

  // ── Auto-dismiss duration ─────────────────────────────────────────
  private readonly TOAST_TTL_MS = 6000;

  constructor(
    private readonly http        : HttpClient,
    private readonly router      : Router,
    private readonly zone        : NgZone,
    private readonly state       : MessagingStateService,
    private readonly auth        : AuthService,
    private readonly userProfile : UserProfileService
  ) {}

  // ══════════════════════════════════════════════════════════════════
  // SSE
  // ══════════════════════════════════════════════════════════════════

  /** Open (or reuse) the SSE connection for userId. */
  connect(userId: number): void {
    if (this.eventSource && this.connectedUser === userId) return;
    this.disconnect();

    const url = `/api/notifications/subscribe?userId=${userId}`;
    this.eventSource   = new EventSource(url);
    this.connectedUser = userId;

    this.eventSource.onopen = () => { this.sseRetryCount = 0; };

    // ── "reminder" event (scheduler-triggered: 1-min unanswered) ────
    this.eventSource.addEventListener('reminder', (e: MessageEvent) => {
      this.zone.run(() => {
        try {
          const payload: ReminderPayload = JSON.parse(e.data);
          this.handleReminder(payload);
        } catch { /* malformed SSE data */ }
      });
    });

    // ── "update" event (auto-archive, general state changes) ─────────
    this.eventSource.addEventListener('update', (e: MessageEvent) => {
      this.zone.run(() => {
        try {
          const data = JSON.parse(e.data);
          if (data.type === 'archived') {
            // Update conversation priority + archived flag in Angular state
            this.state.patchConversation(data.conversationId, {
              isArchived    : true,
              priorityLevel : data.priority ?? 'LOW'
            });
            // Show a LOW-priority archive notice toast
            this.addToast({
              id            : this.genId(),
              conversationId: data.conversationId,
              senderName    : '',
              elapsedLabel  : '',
              priority      : 'LOW',
              type          : 'archive_notice',
              message       : data.message ?? 'A conversation was auto-archived due to inactivity.',
              createdAt     : new Date()
            });
          }
        } catch { /* malformed SSE data */ }
      });
    });

    // ── Error / reconnect ─────────────────────────────────────────────
    this.eventSource.onerror = () => {
      this.eventSource?.close();
      this.eventSource = null;
      this.sseRetryCount++;
      if (this.sseRetryCount > this.SSE_MAX_RETRIES) {
        console.warn('[PriorityNotification] SSE unavailable (communication-service down?) — stopped retrying.');
        return;
      }
      const delay = this.sseRetryCount * 5000;
      console.warn(`[PriorityNotification] SSE connection lost — retry ${this.sseRetryCount}/${this.SSE_MAX_RETRIES} in ${delay / 1000}s`);
      setTimeout(() => this.connect(userId), delay);
    };
  }

  disconnect(): void {
    this.eventSource?.close();
    this.eventSource   = null;
    this.connectedUser = null;
  }

  // ══════════════════════════════════════════════════════════════════
  // LOGIN SCAN
  // ══════════════════════════════════════════════════════════════════

  /**
   * Calls POST /api/notifications/login-scan to retrieve all pending reminders.
   * For each unanswered conversation a toast is shown and the conversation's
   * priorityLevel in the state is corrected.
   */
  triggerLoginScan(userId: number): void {
    // Only run on a fresh login — not on every page refresh.
    if (!sessionStorage.getItem('pending_login_scan')) return;
    sessionStorage.removeItem('pending_login_scan');

    const params = new HttpParams().set('userId', userId.toString());
    this.http.post<ReminderPayload[]>('/api/notifications/login-scan', {}, { params })
      .subscribe({
        next : reminders => reminders.forEach(p => this.handleReminder(p)),
        error: err => console.error('[PriorityNotification] login-scan failed', err)
      });
  }

  // ══════════════════════════════════════════════════════════════════
  // REMINDER HANDLING
  // ══════════════════════════════════════════════════════════════════

  private handleReminder(payload: ReminderPayload): void {
    const convId = payload.conversationId;
    const now    = Date.now();

    // Client-side debounce
    const last = this.shownAt.get(convId);
    if (last && (now - last) < this.DEBOUNCE_MS) return;
    this.shownAt.set(convId, now);

    // Patch conversation priority in the state so the motif updates immediately
    this.state.patchConversation(convId, { priorityLevel: payload.priority });

    // Resolve sender name: from state if enriched, else fetch from user-service
    this.resolveOrFetchName(convId, payload.senderId).subscribe(senderName => {
      const message = payload.elapsedLabel
        ? `${senderName} has sent you a message ${payload.elapsedLabel} ago. Please check the conversation.`
        : `${senderName} has sent you a message. Please check the conversation.`;

      this.addToast({
        id            : this.genId(),
        conversationId: convId,
        senderId      : payload.senderId,
        senderName,
        elapsedLabel  : payload.elapsedLabel,
        priority      : payload.priority,
        type          : payload.type,
        message,
        createdAt     : new Date()
      });
    });
  }

  /** Try to resolve sender name from cached state; falls back to a user-service HTTP call. */
  private resolveOrFetchName(convId: number, senderId?: number): Observable<string> {
    const fromState = this.resolveSenderName(convId, senderId);
    if (fromState !== `User #${senderId}` && fromState !== 'Someone') {
      return of(fromState);
    }
    if (!senderId) {
      return of(fromState);
    }
    return this.userProfile.getUserById(senderId).pipe(
      map(profile => {
        const name = [profile.firstName, profile.lastName].filter(Boolean).join(' ');
        return name || (profile.email ? profile.email.split('@')[0] : '') || `User #${senderId}`;
      }),
      catchError(() => of(`User #${senderId}`))
    );
  }

  // ══════════════════════════════════════════════════════════════════
  // TOAST QUEUE
  // ══════════════════════════════════════════════════════════════════

  addToast(toast: NotificationToast): void {
    const current = this.toastsSubject.getValue();
    // Cap at 5 toasts; newest on top
    this.toastsSubject.next([toast, ...current].slice(0, 5));
    setTimeout(() => this.dismissToast(toast.id), this.TOAST_TTL_MS);
  }

  dismissToast(id: string): void {
    this.toastsSubject.next(
      this.toastsSubject.getValue().filter(t => t.id !== id)
    );
  }

  navigateTo(conversationId: number): void {
    this.router.navigate(['/communication', conversationId]);
  }

  // ══════════════════════════════════════════════════════════════════
  // HELPERS
  // ══════════════════════════════════════════════════════════════════

  /**
   * Resolves the display name of the message sender from the client-side
   * conversation state (which was already enriched via the user-service).
   * Falls back to "User #<id>" if enrichment hasn't completed yet.
   */
  private resolveSenderName(convId: number, senderId?: number): string {
    const conv = this.state.conversations.find(c => c.id === convId);
    if (conv) {
      const myId = this.auth.getNumericUserId();
      // "Other user" is whoever is not the current user
      if (myId && senderId && senderId !== myId) {
        if (conv.otherUserFirstName || conv.otherUserLastName)
          return [conv.otherUserFirstName, conv.otherUserLastName].filter(Boolean).join(' ');
        if (conv.otherUserUsername)
          return conv.otherUserUsername.includes('@')
            ? conv.otherUserUsername.split('@')[0]
            : conv.otherUserUsername;
      }
    }
    return senderId ? `User #${senderId}` : 'Someone';
  }

  private genId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  }
}
