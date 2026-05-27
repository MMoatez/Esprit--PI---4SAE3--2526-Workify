import { Injectable } from '@angular/core';
import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import { Observable, Subject, BehaviorSubject } from 'rxjs';
import SockJS from 'sockjs-client';
import { OfferNotification } from '../models/offer-notification.model';

const STORAGE_KEY = 'workify_notifications';
const MAX_STORED  = 50;

@Injectable({
  providedIn: 'root',
})
export class OfferNotificationWebsocketService {

  private readonly socketUrl = 'http://localhost:8082/ws-notifications-sockjs';

  private client: Client | null = null;
  private topicSubscription: StompSubscription | null = null;
  private topic: string | null = null;

  // ── Stream temps réel (1 notif à la fois) ──────────────
  private readonly notificationSubject = new Subject<OfferNotification>();
  readonly notifications$: Observable<OfferNotification> =
    this.notificationSubject.asObservable();

  // ── Liste persistée (toutes les notifs sauvegardées) ───
  private readonly allNotificationsSubject =
    new BehaviorSubject<OfferNotification[]>(this.loadFromStorage());
  readonly allNotifications$: Observable<OfferNotification[]> =
    this.allNotificationsSubject.asObservable();

  // ── Compteur non lus ───────────────────────────────────
  private readonly unreadCountSubject =
    new BehaviorSubject<number>(this.loadUnreadCount());
  readonly unreadCount$: Observable<number> =
    this.unreadCountSubject.asObservable();

  // ══════════════════════════════════════════════════════
  // CONNECT
  // ══════════════════════════════════════════════════════

  connectToClientNotifications(clientId: number): void {
    this.connectToTopic(`/topic/client-${clientId}-notifications`);
  }

  connectToFreelancerNotifications(): void {
    this.connectToTopic('/topic/freelancers');
  }

  private connectToTopic(nextTopic: string): void {
    if (!this.client) {
      this.initializeClient();
    }
    this.topic = nextTopic;
    if (this.client?.connected) {
      this.subscribeToTopic(nextTopic);
      return;
    }
    if (!this.client?.active) {
      this.client?.activate();
    }
  }

  disconnect(): void {
    this.topicSubscription?.unsubscribe();
    this.topicSubscription = null;
    this.client?.deactivate();
    this.client = null;
  }

  // ══════════════════════════════════════════════════════
  // MARK AS READ / CLEAR
  // ══════════════════════════════════════════════════════

  markAllAsRead(): void {
    this.unreadCountSubject.next(0);
    localStorage.setItem('workify_unread', '0');
  }

  clearAll(): void {
    this.allNotificationsSubject.next([]);
    this.unreadCountSubject.next(0);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.setItem('workify_unread', '0');
  }

  // ══════════════════════════════════════════════════════
  // PRIVATE
  // ══════════════════════════════════════════════════════

  private initializeClient(): void {
    this.client = new Client({
      webSocketFactory: () => new SockJS(this.socketUrl),
      reconnectDelay: 5000,
      debug: () => undefined,
    });

    this.client.onConnect = () => {
      if (this.topic) {
        this.subscribeToTopic(this.topic);
      }
    };

    this.client.onStompError = (frame) => {
      console.error('STOMP error:', frame.headers['message'], frame.body);
    };

    this.client.onWebSocketError = (event) => {
      console.error('WebSocket error:', event);
    };
  }

  private subscribeToTopic(topic: string): void {
    if (!this.client?.connected) return;

    this.topicSubscription?.unsubscribe();
    this.topicSubscription = this.client.subscribe(
      topic,
      (message: IMessage) => {
        const notif = this.parsePayload(message.body);

        // 1. Émet pour l'affichage immédiat (comportement existant)
        this.notificationSubject.next(notif);

        // 2. Sauvegarde dans localStorage
        this.persist(notif);
      },
    );
  }

  // ── Persistence ────────────────────────────────────────

  private persist(notif: OfferNotification): void {
    const current = this.allNotificationsSubject.getValue();
    const updated  = [notif, ...current].slice(0, MAX_STORED);

    // Mise à jour du BehaviorSubject
    this.allNotificationsSubject.next(updated);

    // Sauvegarde localStorage
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // Quota dépassé → on vide et on réessaie
      localStorage.removeItem(STORAGE_KEY);
      localStorage.setItem(STORAGE_KEY, JSON.stringify([notif]));
    }

    // Compteur non lus
    const unread = this.unreadCountSubject.getValue() + 1;
    this.unreadCountSubject.next(unread);
    localStorage.setItem('workify_unread', String(unread));
  }

  private loadFromStorage(): OfferNotification[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as OfferNotification[]) : [];
    } catch {
      return [];
    }
  }

  private loadUnreadCount(): number {
    try {
      return parseInt(localStorage.getItem('workify_unread') ?? '0', 10) || 0;
    } catch {
      return 0;
    }
  }

  // ══════════════════════════════════════════════════════
  // PARSE
  // ══════════════════════════════════════════════════════

  private parsePayload(payload: string): OfferNotification {
    try {
      const parsed = JSON.parse(payload) as Record<string, unknown>;
      const title   = this.pickString(parsed, ['title', 'titre']);
      const message = this.pickString(parsed, ['message', 'content', 'description']);
      const offerId    = this.pickNumber(parsed, ['offerId', 'offreId']);
      const projectId  = this.pickNumber(parsed, ['projectId', 'projetId', 'id']);
      let projectTitle  = this.pickString(parsed, ['projectTitle', 'projetTitre', 'projectName']);
      let freelancerName = this.pickString(parsed, ['freelancerName', 'nomFreelancer', 'freelancer']);
      let clientName    = this.pickString(parsed, ['clientName', 'nomClient', 'client']);
      let price         = this.pickNumber(parsed, ['price', 'amount', 'montant', 'offreMontant']);

      if (message) {
        projectTitle   = projectTitle   ?? this.extractProjectTitle(message);
        freelancerName = freelancerName ?? this.extractFreelancerName(message);
        clientName     = clientName     ?? this.extractClientName(message);
        price          = price          ?? this.extractPrice(message);
      }

      return {
        type:          this.pickString(parsed, ['type'])      || undefined,
        title:         title                                   || undefined,
        offerId:       offerId                                 ?? undefined,
        projectId:     projectId                              ?? undefined,
        projectTitle:  projectTitle                           || undefined,
        freelancerName: freelancerName                        || undefined,
        clientName:    clientName                             || undefined,
        price:         price                                  ?? undefined,
        message:       message                                || undefined,
        createdAt:     this.pickString(parsed, ['createdAt', 'timestamp']) || new Date().toISOString(),
      };
    } catch {
      return { message: payload, createdAt: new Date().toISOString() };
    }
  }

  private pickString(source: Record<string, unknown>, keys: string[]): string | null {
    for (const key of keys) {
      const value = source[key];
      if (typeof value === 'string' && value.trim()) return value;
    }
    return null;
  }

  private pickNumber(source: Record<string, unknown>, keys: string[]): number | null {
    for (const key of keys) {
      const value = source[key];
      if (typeof value === 'number' && !Number.isNaN(value)) return value;
      if (typeof value === 'string') {
        const parsed = Number(value);
        if (!Number.isNaN(parsed)) return parsed;
      }
    }
    return null;
  }

  private extractProjectTitle(message: string): string | null {
    const m = message.match(/[«"]\s*([^»"]+)\s*[»"]/i);
    if (m?.[1]) return m[1].trim();
    const f = message.match(/projet\s+([^\.!,]+)/i);
    return f?.[1]?.trim() || null;
  }

  private extractFreelancerName(message: string): string | null {
    const m = message.match(/^\s*(.+?)\s+a\s+soumis\s+une\s+offre/i);
    return m?.[1]?.trim() || null;
  }

  private extractClientName(message: string): string | null {
    const m = message.match(/^\s*(.+?)\s+a\s+(créé|publié|posté)\s+/i);
    return m?.[1]?.trim() || null;
  }

  private extractPrice(message: string): number | null {
    const m = message.match(/offre\s+de\s+([\d\s.,]+)\s*(tnd|dt|€|\$)?/i);
    if (!m?.[1]) return null;
    const n = Number(m[1].replace(/\s/g, '').replace(',', '.'));
    return Number.isNaN(n) ? null : n;
  }
}