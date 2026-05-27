import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Conversation } from '../models/conversation.model';

/**
 * MessagingStateService
 * ─────────────────────
 * Single source of truth for the conversation list.
 * Both conversation-list and message-thread share this state —
 * no duplicate HTTP calls, no list disappearing on navigation.
 */
@Injectable({ providedIn: 'root' })
export class MessagingStateService {

  // ── State ───────────────────────────────────────────────
  private _conversations = new BehaviorSubject<Conversation[]>([]);
  private _isLoading     = new BehaviorSubject<boolean>(false);
  private _selectedId    = new BehaviorSubject<number | null>(null);

  /**
   * Shared set across ALL components — tracks conversation IDs whose other-participant
   * profile is already fetched or currently being fetched.
   * Using a singleton Set prevents the cascade loop:
   *   patchConversation() → conversations$ emits → N subscribers each try to enrich → M calls.
   * With this Set, exactly ONE HTTP call is made per conversation ID, globally.
   */
  readonly enrichingIds = new Set<number>();

  // ── Public observables ──────────────────────────────────
  conversations$: Observable<Conversation[]> = this._conversations.asObservable();
  isLoading$:     Observable<boolean>        = this._isLoading.asObservable();
  selectedId$:    Observable<number | null>  = this._selectedId.asObservable();

  // ── Snapshot getters ────────────────────────────────────
  get conversations(): Conversation[] { return this._conversations.getValue(); }
  get selectedId(): number | null     { return this._selectedId.getValue(); }
  get isLoading(): boolean            { return this._isLoading.getValue(); }

  // ── Cache reset ─────────────────────────────────────────
  /**
   * Called at the start of every forceRefresh so that a stale numeric user ID
   * (kept in localStorage when a token expires) never causes another user's
   * profile to be permanently cached as the "other participant".
   * Clears the dedup set AND wipes enriched fields from all conversations
   * so that the next setConversations() call triggers fresh enrichment with
   * the correct myId.
   */
  clearEnrichmentCache(): void {
    this.enrichingIds.clear();
    const cleared = this._conversations.getValue().map(c => ({
      ...c,
      otherUserFirstName      : undefined as any,
      otherUserLastName       : undefined as any,
      otherUserUsername       : undefined as any,
      otherUserProfilePicture : undefined as any,
      otherUserId             : undefined as any,
    }));
    this._conversations.next(cleared);
  }

  // ── Setters ─────────────────────────────────────────────
  /**
   * Replaces the conversation list but PRESERVES enriched profile data
   * (otherUserFirstName/LastName/ProfilePicture/etc.) already fetched from user-service.
   * Without this, every auto-refresh wipes the enriched names and they flicker back
   * to "Chat with …" until the next enrichment cycle completes.
   */
  setConversations(list: Conversation[]): void {
    const prev    = this._conversations.getValue();
    const prevMap = new Map(prev.map(c => [c.id, c]));
    const merged  = list.map(c => {
      const p = prevMap.get(c.id);
      if (!p) return c;
      return {
        ...c,
        otherUserFirstName      : c.otherUserFirstName      || p.otherUserFirstName,
        otherUserLastName       : c.otherUserLastName       || p.otherUserLastName,
        otherUserUsername       : c.otherUserUsername       || p.otherUserUsername,
        otherUserProfilePicture : c.otherUserProfilePicture || p.otherUserProfilePicture,
        otherUserId             : c.otherUserId             || p.otherUserId,
      };
    });

    // Deduplicate by participant pair — keeps the most relevant row per pair
    // (legacy DB data may have multiple rows between the same two users)
    const seenPairs = new Map<string, Conversation>();
    for (const conv of merged) {
      if (!conv.creatorId || !conv.receiverId) { seenPairs.set(`solo-${conv.id}`, conv); continue; }
      const key = [Math.min(conv.creatorId, conv.receiverId), Math.max(conv.creatorId, conv.receiverId)].join('-');
      const existing = seenPairs.get(key);
      if (!existing) {
        seenPairs.set(key, conv);
      } else {
        // Prefer: active + non-blocked > archived non-blocked > blocked; then most recent
        const score = (c: Conversation) =>
          c.status === 'BLOCKED' ? 0 : (c.isArchived ? 1 : 2);
        if (score(conv) > score(existing)) {
          seenPairs.set(key, conv);
        } else if (score(conv) === score(existing)) {
          const t1 = existing.lastMessageAt ? new Date(existing.lastMessageAt as any).getTime() : 0;
          const t2 = conv.lastMessageAt     ? new Date(conv.lastMessageAt     as any).getTime() : 0;
          if (t2 > t1) seenPairs.set(key, conv);
        }
      }
    }

    this._conversations.next(Array.from(seenPairs.values()));
  }
  setLoading(v: boolean): void                 { this._isLoading.next(v); }
  setSelectedId(id: number | null): void       { this._selectedId.next(id); }

  // ── Local mutations (avoid full reloads) ────────────────
  upsertConversation(updated: Conversation): void {
    const list = this.conversations.map(c =>
      c.id === updated.id ? { ...c, ...updated } : c
    );
    if (!list.find(c => c.id === updated.id)) list.unshift(updated);
    this._conversations.next(list);
  }

  /**
   * removeConversation — called optimistically by deleteConversation()
   * before the HTTP request completes so the UI updates instantly.
   * Also called by the backend response handler for cleanup.
   */
  removeConversation(id: number): void {
    this._conversations.next(this.conversations.filter(c => c.id !== id));
  }

  patchConversation(id: number, patch: Partial<Conversation>): void {
    this._conversations.next(
      this.conversations.map(c => c.id === id ? { ...c, ...patch } : c)
    );
  }

  // ── Persistent pinning (localStorage) ──────────────────
  private readonly PINNED_KEY = 'workify_pinned_conversations';

  getPinnedIds(): number[] {
    try {
      const stored = localStorage.getItem(this.PINNED_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  }

  togglePin(id: number): void {
    const pinned = this.getPinnedIds();
    const idx = pinned.indexOf(id);
    if (idx > -1) pinned.splice(idx, 1);
    else pinned.push(id);
    localStorage.setItem(this.PINNED_KEY, JSON.stringify(pinned));
    this._conversations.next([...this.conversations]); // trigger re-render
  }

  isPinned(id: number): boolean {
    return this.getPinnedIds().includes(id);
  }
}
