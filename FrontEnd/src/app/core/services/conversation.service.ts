import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, tap, catchError, timer, Subscription, switchMap } from 'rxjs';
import {
  Conversation, CreateConversationDTO, PageableResponse
} from '../models/conversation.model';
import { MessagingStateService } from './messaging-state.service';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class ConversationService {

  private readonly apiUrl = '/api/conversations';
  private refreshSub: Subscription | null = null;

  constructor(
    private http : HttpClient,
    private state: MessagingStateService,
    private auth : AuthService
  ) {}

  // ── AUTO-REFRESH ──────────────────────────────────────────────
  startAutoRefresh(intervalMs = 5000): void {
    if (this.refreshSub) return;
    this.refreshSub = timer(0, intervalMs).pipe(
      switchMap(() => {
        const uid = this.getCurrentUserId();
        if (!uid) return of({ content: [], totalElements: 0, totalPages: 0, size: 50, number: 0 } as PageableResponse<Conversation>);
        return this.http.get<PageableResponse<Conversation>>(this.apiUrl, {
          params: new HttpParams()
            .set('userId', uid.toString())
            .set('page', '0').set('size', '50')
        });
      })
    ).subscribe({
      next: res => {
        const incoming = res.content || [];
        const current  = this.state.conversations;
        // Check length, or any shift in conversation order/unreadCount/lastMessage
        const changed =
          incoming.length !== current.length ||
          incoming.some((c, i) => {
            const p = current[i];
            return !p ||
              c.id             !== p.id             ||
              c.unreadCount    !== p.unreadCount    ||
              c.lastMessageAt  !== p.lastMessageAt  ||
              c.lastMessageContent !== p.lastMessageContent;
          });
        if (changed) this.state.setConversations(incoming);
      },
      error: err => console.error('❌ autoRefresh', err)
    });
  }

  stopAutoRefresh(): void {
    this.refreshSub?.unsubscribe();
    this.refreshSub = null;
  }

  // ── CREATE ────────────────────────────────────────────────────
  createConversation(dto: CreateConversationDTO): Observable<Conversation> {
    const params = new HttpParams().set('currentUserId', this.getCurrentUserId().toString());
    return this.http.post<Conversation>(`${this.apiUrl}/start`, dto, { params }).pipe(
      tap(conv => this.state.upsertConversation(conv)),
      catchError(err => {
        if (err.status === 409) {
          // The existing conversation between these two users is BLOCKED.
          // Re-throw a structured error so callers can show a clear warning.
          const blockedError = new Error('BLOCKED_CONVERSATION');
          (blockedError as any).conversation = err.error;   // the blocked Conversation object
          (blockedError as any).isBlocked = true;
          throw blockedError;
        }
        console.error('❌ createConversation', err);
        throw err;
      })
    );
  }

  getOrCreateConversation(dto: CreateConversationDTO): Observable<Conversation> {
    return this.createConversation(dto);
  }

  // ── LOAD / GET ────────────────────────────────────────────────
  loadAllConversations(forceRefresh = false): void {
    const userId = this.getCurrentUserId();
    if (!userId) return;
    if (!forceRefresh && this.state.conversations.length > 0) return;
    // On every forced refresh, wipe the enrichment cache so that a stale
    // numeric user ID (from a previous session) never permanently locks in
    // the wrong profile as "other participant".
    if (forceRefresh) this.state.clearEnrichmentCache();
    this.state.setLoading(true);
    const params = new HttpParams()
      .set('userId', userId.toString())
      .set('page', '0').set('size', '50');
    this.http.get<PageableResponse<Conversation>>(this.apiUrl, { params }).pipe(
      catchError(err => {
        console.error('❌ loadAllConversations', err);
        this.state.setLoading(false);
        return of({ content: [], totalElements: 0, totalPages: 0, size: 50, number: 0 } as any);
      })
    ).subscribe(res => {
      this.state.setConversations(res.content || []);
      this.state.setLoading(false);
    });
  }

  getAllConversations(userId: number, page = 0, size = 50): Observable<PageableResponse<Conversation>> {
    const params = new HttpParams()
      .set('userId', userId.toString())
      .set('page', page.toString())
      .set('size', size.toString());
    return this.http.get<PageableResponse<Conversation>>(this.apiUrl, { params }).pipe(
      catchError(err => { console.error('❌ getAllConversations', err); throw err; })
    );
  }

  getConversationById(conversationId: number): Observable<Conversation> {
    const params = new HttpParams().set('currentUserId', this.getCurrentUserId().toString());
    return this.http.get<Conversation>(`${this.apiUrl}/${conversationId}`, { params }).pipe(
      tap(conv => this.state.upsertConversation(conv)),
      catchError(err => { console.error('❌ getConversationById', err); throw err; })
    );
  }

  // ── UPDATE ────────────────────────────────────────────────────
  updateConversation(conversationId: number, updates: Partial<Conversation>): Observable<Conversation> {
    return this.http.put<Conversation>(`${this.apiUrl}/${conversationId}`, updates).pipe(
      tap(updated => this.state.upsertConversation(updated)),
      catchError(err => { console.error('❌ updateConversation', err); throw err; })
    );
  }

  toggleFavorite(conversationId: number, currentValue: boolean): Observable<Conversation> {
    return this.http.put<Conversation>(`${this.apiUrl}/${conversationId}`, { isFavorite: !currentValue }).pipe(
      tap(updated => this.state.patchConversation(conversationId, { isFavorite: updated.isFavorite })),
      catchError(err => { console.error('❌ toggleFavorite', err); throw err; })
    );
  }

  /**
   * toggleArchive — FIX
   *
   * The HTTP call uses UpdateConversationDTO which only needs isArchived.
   * The archivedAt is computed server-side.
   * The tap() syncs the server's confirmed values back to the store
   * (the optimistic update is done by the component BEFORE this is called).
   */
  toggleArchive(conversationId: number, currentValue: boolean): Observable<Conversation> {
    const newValue = !currentValue;
    return this.http.put<Conversation>(`${this.apiUrl}/${conversationId}`, {
      isArchived: newValue
    }).pipe(
      tap(updated => {
        // ✅ Sync confirmed server values (archivedAt is set server-side)
        this.state.patchConversation(conversationId, {
          isArchived: updated.isArchived,
          archivedAt: updated.archivedAt
        });
      }),
      catchError(err => { console.error('❌ toggleArchive', err); throw err; })
    );
  }

  togglePinConversation(conversationId: number): Observable<void> {
    this.state.togglePin(conversationId);
    return of(void 0);
  }

  isConversationPinned(conversationId: number): boolean {
    return this.state.isPinned(conversationId);
  }

  markAllAsRead(conversationId: number): Observable<void> {
    const params = new HttpParams().set('userId', this.getCurrentUserId().toString());
    return this.http.patch<void>(`${this.apiUrl}/${conversationId}/read-all`, {}, { params }).pipe(
      tap(() => this.state.patchConversation(conversationId, { unreadCount: 0 })),
      catchError(err => { console.error('❌ markAllAsRead', err); throw err; })
    );
  }

  // ── BLOCK / UNBLOCK ───────────────────────────────────────────
  blockConversation(conversationId: number): Observable<Conversation> {
    const params = new HttpParams().set('currentUserId', this.getCurrentUserId().toString());
    return this.http.post<Conversation>(`${this.apiUrl}/${conversationId}/block`, {}, { params }).pipe(
      tap(updated => this.state.patchConversation(conversationId, {
        status     : updated.status,
        blockedById: updated.blockedById
      })),
      catchError(err => { console.error('❌ blockConversation', err); throw err; })
    );
  }

  unblockConversation(conversationId: number): Observable<Conversation> {
    const params = new HttpParams().set('currentUserId', this.getCurrentUserId().toString());
    return this.http.post<Conversation>(`${this.apiUrl}/${conversationId}/unblock`, {}, { params }).pipe(
      tap(updated => this.state.patchConversation(conversationId, {
        status     : updated.status,
        blockedById: updated.blockedById
      })),
      catchError(err => { console.error('❌ unblockConversation', err); throw err; })
    );
  }

  // ── DELETE ────────────────────────────────────────────────────
  deleteConversation(conversationId: number): Observable<void> {
    this.state.removeConversation(conversationId);
    const params = new HttpParams().set('currentUserId', this.getCurrentUserId().toString());
    return this.http.delete<void>(`${this.apiUrl}/${conversationId}`, { params }).pipe(
      tap(() => console.log('✅ Hard-deleted conversation from DB:', conversationId)),
      catchError(err => {
        if (err.status === 404) {
          console.warn(`Conversation ${conversationId} already deleted (404) — ignoring`);
          return of(void 0);
        }
        console.error('❌ deleteConversation failed — restoring list', err);
        this.loadAllConversations(true);
        throw err;
      })
    );
  }

  // ── SORT ──────────────────────────────────────────────────────
  sortConversations(conversations: Conversation[], sortBy: 'date' | 'priority'): Conversation[] {
    const pinned   = conversations.filter(c =>  this.state.isPinned(c.id));
    const unpinned = conversations.filter(c => !this.state.isPinned(c.id));

    const sortFn = (a: Conversation, b: Conversation): number => {
      if (sortBy === 'priority') {
        const order: Record<string, number> = { HIGH: 1, MEDIUM: 2, LOW: 3 };
        const diff = (order[a.priorityLevel] ?? 4) - (order[b.priorityLevel] ?? 4);
        if (diff !== 0) return diff;
      }
      const da = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
      const db = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
      return db - da;
    };

    return [...pinned.sort(sortFn), ...unpinned.sort(sortFn)];
  }

  // ── HELPERS ───────────────────────────────────────────────────
  getCurrentUserId(): number         { return this.auth.getNumericUserId() ?? 0; }
  getCurrentUserIdAsNumber(): number { return this.auth.getNumericUserId() ?? 0; }
}
