import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject, tap, map, of, throwError, timer, Subscription, switchMap } from 'rxjs';
import { distinctUntilChanged } from 'rxjs/operators';
import {
  Message,
  SendMessageRequest,
  UpdateMessageDTO,
  PageableResponse,
  DeliveryStatus,
  MessageContentType
} from '../models/conversation.model';
import { ConversationService } from './conversation.service';

@Injectable({
  providedIn: 'root'
})
export class MessageService {
  private apiUrl = `/api/messages`;
  private convApiUrl = `/api/conversations`;

  private get currentUserId(): number {
    return this.conversationService.getCurrentUserIdAsNumber();
  }

  private messagesSubject = new BehaviorSubject<Message[]>([]);
  public messages$ = this.messagesSubject.asObservable();

  // Provide snapshot access to current messages (used by UI components)
  public getMessagesSnapshot(): Message[] {
    return this.messagesSubject.value;
  }

  // Polling subscription for an open conversation thread
  private pollSub: Subscription | null = null;

  /**
   * Start polling messages for a conversation to keep thread updated in near real-time.
   * Polling will update the `messages$` observable.
   */
  startPolling(conversationId: number, intervalMs: number = 5000): void {
    this.stopPolling();
    const userId = this.currentUserId;
    // Skip first tick (0ms) - initial load is done separately
    this.pollSub = timer(intervalMs, intervalMs).pipe(
      switchMap(() => this.http.get<any[]>(
        `${this.apiUrl}/conversation/${conversationId}`,
        { params: new HttpParams().set('userId', userId.toString()) }
      ))
    ).subscribe({
      next: (rawMessages) => {
        const arr = (Array.isArray(rawMessages) ? rawMessages : []).map(m => this.normalizeMessage(m));
        const sorted = this.sortMessages(arr, true);
        const current = this.messagesSubject.value;
        // ✅ Only update state if messages actually changed (prevents flash/disappear)
        const currentIds = current.map(m => `${m.id}-${m.content}-${m.reactionEmoji}-${m.isDeleted}`).join(',');
        const newIds = sorted.map(m => `${m.id}-${m.content}-${m.reactionEmoji}-${m.isDeleted}`).join(',');
        if (currentIds !== newIds) {
          this.messagesSubject.next(sorted);
        }
      },
      error: err => console.error('❌ pollMessages', err)
    });
  }

  stopPolling(): void {
    if (this.pollSub) { this.pollSub.unsubscribe(); this.pollSub = null; }
  }

  constructor(
    private http: HttpClient,
    private conversationService: ConversationService
  ) {}

  private asDate(value: any): Date {
    if (value instanceof Date) return value;
    if (typeof value === 'number') return new Date(value);
    if (typeof value === 'string') {
      const parsed = new Date(value);
      if (!Number.isNaN(parsed.getTime())) return parsed;
    }
    return new Date();
  }

  private normalizeMessage(raw: any): Message {
    const message: Message = {
      id: typeof raw?.id === 'number' ? raw.id : Number(raw?.id),
      conversationId: typeof raw?.conversationId === 'number' ? raw.conversationId : Number(raw?.conversationId),
      senderId: typeof raw?.senderId === 'number' ? raw.senderId : Number(raw?.senderId),
      content: raw?.content ?? '',
      contentType: raw?.contentType as MessageContentType,
      reactionEmoji: raw?.reactionEmoji ?? undefined,
      deliveryStatus: (raw?.deliveryStatus as DeliveryStatus) ?? DeliveryStatus.SENT,
      createdAt: this.asDate(raw?.createdAt),
      isEdited: !!raw?.isEdited,
      isDeleted: !!raw?.isDeleted,
      isFlagged: !!raw?.isFlagged,
      flaggedReason: raw?.flaggedReason ?? undefined,
      violationCount: raw?.violationCount ?? undefined,
      bannedUntil: raw?.bannedUntil ?? undefined
    };
    return message;
  }

  // ===========================
  // CREATE
  // ===========================

  sendMessage(request: SendMessageRequest): Observable<Message> {
    const senderId = this.currentUserId;
    if (!senderId) {
      return throwError(() => new Error('NOT_AUTHENTICATED'));
    }
    const params = new HttpParams().set('senderId', senderId.toString());
    return this.http.post<Message>(this.apiUrl, request, { params }).pipe(
      map(raw => this.normalizeMessage(raw)),
      tap(message => {
        const next = [...this.messagesSubject.value, message];
        this.messagesSubject.next(this.sortMessages(next, true));
      })
    );
  }

  /**
   * No multipart endpoint on backend → send file as base64 text message
   */
  sendMessageWithFile(
    conversationId: number,
    file: File,
    contentType: MessageContentType
  ): Observable<Message> {
    const senderId = this.currentUserId;
    if (!senderId) {
      return throwError(() => new Error('NOT_AUTHENTICATED'));
    }
    const formData = new FormData();
    formData.append('file', file);
    const params = new HttpParams()
      .set('senderId', senderId.toString())
      .set('conversationId', conversationId.toString())
      .set('contentType', String(contentType));

    return this.http.post<Message>(`${this.apiUrl}/upload`, formData, { params }).pipe(
      map(raw => this.normalizeMessage(raw)),
      tap(message => {
        const next = [...this.messagesSubject.value, message];
        this.messagesSubject.next(this.sortMessages(next, true));
      })
    );
  }

  // ===========================
  // READ
  // ===========================

  /**
   * Backend returns List<MessageResponse> (plain array, not paginated)
   * GET /api/messages/conversation/{id}
   *
   * ✅ Does NOT push to messagesSubject here — the component sets isLoading=false
   * FIRST, then calls setMessages() to avoid the blank-bubble flash.
   */
  getMessagesByConversation(
    conversationId: number,
    page: number = 0,
    size: number = 50
  ): Observable<PageableResponse<Message>> {
    const params = new HttpParams().set('userId', this.currentUserId.toString());
    return this.http.get<Message[]>(
      `${this.apiUrl}/conversation/${conversationId}`,
      { params }
    ).pipe(
      map(rawMessages => {
        const arr = (Array.isArray(rawMessages) ? rawMessages : []).map(m => this.normalizeMessage(m));
        return {
          content: arr,
          totalElements: arr.length,
          totalPages: 1,
          size: arr.length,
          number: 0
        };
      })
      // ✅ NO tap() here — component's subscribe.next() calls setMessages() after isLoading=false
    );
  }

  /**
   * Commit fetched messages to the state — call this AFTER setting isLoading = false
   */
  setMessages(messages: Message[]): void {
    const sorted = this.sortMessages(messages, true);
    this.messagesSubject.next(sorted);
  }

  getMessageById(id: number): Observable<Message> {
    return this.http.get<Message>(`${this.apiUrl}/${id}`).pipe(
      map(raw => this.normalizeMessage(raw))
    );
  }

  // ===========================
  // UPDATE
  // ===========================

  /**
   * Edit message content
   * PUT /api/messages/{id}
   */
  updateMessage(id: number, dto: UpdateMessageDTO): Observable<Message> {
    return this.http.put<Message>(`${this.apiUrl}/${id}`, dto).pipe(
      map(raw => this.normalizeMessage(raw)),
      tap(updatedMessage => this.updateMessageInState(id, updatedMessage))
    );
  }

  /**
   * Add emoji reaction - uses PUT since backend has no separate PATCH reaction endpoint
   */
  addReaction(id: number, emoji: string): Observable<Message> {
    return this.http.put<Message>(`${this.apiUrl}/${id}`, { reactionEmoji: emoji } as UpdateMessageDTO).pipe(
      map(raw => this.normalizeMessage(raw)),
      tap(updatedMessage => this.updateMessageInState(id, updatedMessage))
    );
  }

  removeReaction(id: number): Observable<Message> {
    return this.http.put<Message>(`${this.apiUrl}/${id}`, { reactionEmoji: null } as any).pipe(
      map(raw => this.normalizeMessage(raw)),
      tap(updatedMessage => this.updateMessageInState(id, updatedMessage))
    );
  }

  /**
   * Mark single message as read
   * PATCH /api/messages/{id}/read
   */
  markAsRead(id: number): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/${id}/read`, {}).pipe(
      tap(() => {
        const messages = this.messagesSubject.value.map(msg =>
          msg.id === id ? { ...msg, deliveryStatus: DeliveryStatus.READ } : msg
        );
        this.messagesSubject.next(messages);
      })
    );
  }

  /**
   * Mark all as read — only updates deliveryStatus in state, no full re-render
   * PATCH /api/conversations/{conversationId}/read-all?userId=1
   */
  markAllAsRead(conversationId: number): Observable<void> {
    return this.http.patch<void>(
      `${this.convApiUrl}/${conversationId}/read-all`,
      {},
      { params: new HttpParams().set('userId', this.currentUserId.toString()) }
    ).pipe(
      tap(() => {
        // ✅ Only update deliveryStatus in-place — do NOT replace entire array
        // (replacing with a new array triggers subscribeToMessages → re-render flash)
        const current = this.messagesSubject.value;
        const anyUnread = current.some(m => m.deliveryStatus !== DeliveryStatus.READ);
        if (anyUnread) {
          this.messagesSubject.next(
            current.map(msg => ({ ...msg, deliveryStatus: DeliveryStatus.READ }))
          );
        }
      })
    );
  }

  // Pin uses sessionStorage so pinned messages survive navigation
  private get pinnedMessageIds(): Set<number> {
    try {
      const raw = sessionStorage.getItem('pinnedMsgIds');
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch { return new Set(); }
  }

  private savePinnedMessageIds(ids: Set<number>): void {
    try { sessionStorage.setItem('pinnedMsgIds', JSON.stringify([...ids])); } catch {}
  }

  togglePinMessage(id: number): Observable<void> {
    const ids = this.pinnedMessageIds;
    if (ids.has(id)) { ids.delete(id); } else { ids.add(id); }
    this.savePinnedMessageIds(ids);

    // Update local messages state with isPinned flag
    const messages = this.messagesSubject.value.map(msg =>
      msg.id === id ? { ...msg, isPinned: ids.has(id) } : msg
    );
    this.messagesSubject.next(messages);
    return of(void 0);
  }

  isMessagePinned(id: number): boolean {
    return this.pinnedMessageIds.has(id);
  }

  // ===========================
  // DELETE
  // ===========================

  /**
   * Hard delete — supprime définitivement de la DB et du state local
   * DELETE /api/messages/{id}/permanent
   */
  deleteMessage(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}/permanent`).pipe(
      tap(() => {
        const messages = this.messagesSubject.value.filter(msg => msg.id !== id);
        this.messagesSubject.next(messages);
      })
    );
  }

  permanentDeleteMessage(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}/permanent`).pipe(
      tap(() => {
        const messages = this.messagesSubject.value.filter(msg => msg.id !== id);
        this.messagesSubject.next(messages);
      })
    );
  }

  // ===========================
  // UTILITIES
  // ===========================

  clearMessages(): void {
    this.messagesSubject.next([]);
  }

  addMessageLocally(message: Message): void {
    this.messagesSubject.next([...this.messagesSubject.value, message]);
  }

  sortMessages(messages: Message[], ascending: boolean = true): Message[] {
    return [...messages].sort((a, b) => {
      const dateA = new Date(a.createdAt as any).getTime();
      const dateB = new Date(b.createdAt as any).getTime();
      return ascending ? dateA - dateB : dateB - dateA;
    });
  }

  private updateMessageInState(id: number, updatedMessage: Message): void {
    const messages = this.messagesSubject.value.map(msg =>
      msg.id === id ? updatedMessage : msg
    );
    this.messagesSubject.next(messages);
  }
}
