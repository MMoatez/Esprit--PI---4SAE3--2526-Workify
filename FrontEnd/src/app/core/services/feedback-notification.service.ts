import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { HttpClient } from '@angular/common/http';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';

export interface FeedbackToast {
  id: string;
  type: string;
  title: string;
  message: string;
  icon: string;
  relatedId: number | null;
}

@Injectable({ providedIn: 'root' })
export class FeedbackNotificationService implements OnDestroy {

  private stompClient: Client | null = null;
  private connecting = false;
  private toastSeq = 0;
  private toastsSubject = new BehaviorSubject<FeedbackToast[]>([]);
  readonly toasts$ = this.toastsSubject.asObservable();

  constructor(private auth: AuthService, private http: HttpClient) {}

  connect(): void {
    if (this.stompClient?.active || this.connecting) {
      return;
    }

    const freelancerId = this.auth.getNumericUserId();
    const email = this.auth.getUserEmail();
    if (!freelancerId && !email) return;
    this.connecting = true;

    const handler = (msg: any) => {
      try {
        const notif = JSON.parse(msg.body);
        this.push({
          id:        this.createToastId('ws'),
          type:      notif.type      || 'INFO',
          title:     notif.title     || 'Notification',
          message:   notif.message   || '',
          icon:      notif.icon      || '🔔',
          relatedId: notif.relatedId || null,
        });
      } catch (_) {}
    };

    // Login-scan: show immediately on connect, before WS establishes
    if (email) {
      this.http.get<any[]>(
        `${environment.feedbackApiBaseUrl}/api/evaluation/pending?clientEmail=${encodeURIComponent(email)}`
      ).subscribe(pending => {
        pending.forEach(p => {
          const days = Math.max(1, Math.ceil(p.secondsRemaining / 86400));
          this.push({
            id: 'eval-' + p.offerId,
            type: 'EVALUATION_PENDING',
            title: 'Feedback required',
            message: `Your project "${p.projectTitle}" is complete. Leave your feedback within ${days} day(s).`,
            icon: '⭐',
            relatedId: p.offerId,
          });
        });
      });
    }

    this.stompClient = new Client({
      webSocketFactory: () => new SockJS('http://localhost:8086/ws-feedback'),
      reconnectDelay: 5000,
      onConnect: () => {
        this.connecting = false;
        if (freelancerId) {
          this.stompClient!.subscribe(
            `/topic/freelancer-${freelancerId}-notifications`, handler);
        }
        if (email) {
          this.stompClient!.subscribe(
            `/topic/client-${email}-notifications`, handler);
        }
      },
      onStompError: () => {
        this.connecting = false;
      },
      onWebSocketClose: () => {
        this.connecting = false;
      },
    });

    this.stompClient.activate();
  }

  disconnect(): void {
    this.stompClient?.deactivate();
    this.stompClient = null;
    this.connecting = false;
  }

  dismiss(id: string): void {
    this.toastsSubject.next(this.toastsSubject.value.filter(t => t.id !== id));
  }

  private push(toast: FeedbackToast): void {
    const current = this.toastsSubject.value;
    const existingIndex = current.findIndex((t) => t.id === toast.id);

    if (existingIndex >= 0) {
      const updated = [...current];
      updated[existingIndex] = toast;
      this.toastsSubject.next(updated);
    } else {
      this.toastsSubject.next([...current, toast]);
    }

    setTimeout(() => this.dismiss(toast.id), 7000);
  }

  private createToastId(prefix: string): string {
    this.toastSeq += 1;
    return `${prefix}-${Date.now()}-${this.toastSeq}`;
  }

  ngOnDestroy(): void {
    this.disconnect();
  }
}
