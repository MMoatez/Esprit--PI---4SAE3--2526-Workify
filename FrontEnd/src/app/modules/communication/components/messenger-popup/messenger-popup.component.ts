import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { Router } from '@angular/router';
import { environment } from '../../../../../environments/environment';
import { Subscription } from 'rxjs';
import { forkJoin, of } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { NgZone } from '@angular/core';
import { catchError } from 'rxjs/operators';
import { MessagingStateService } from '../../../../core/services/messaging-state.service';
import { MessageService } from '../../../../core/services/message.service';
import { ConversationService } from '../../../../core/services/conversation.service';
import { AuthService } from '../../../../core/services/auth.service';
import { UserProfileService } from '../../../../core/services/user-profile.service';
import { Conversation, Message, CreateConversationDTO } from '../../../../core/models/conversation.model';
import type { UserProfile } from '../../../../core/models/user-profile.model';

@Component({
  selector: 'app-messenger-popup',
  standalone: false,
  templateUrl: './messenger-popup.component.html',
  styleUrls: ['./messenger-popup.component.css']
})
export class MessengerPopupComponent implements OnInit, OnDestroy {
  @Input() inline: boolean = false;

  // ── Panel state ─────────────────────────────────────────────────
  isOpen     = false;
  fullScreen = false;
  glow       = false;

  // ── Search ──────────────────────────────────────────────────────
  searchTerm = '';

  // ── People tabs ─────────────────────────────────────────────────
  activePeopleTab: 'freelancers' | 'clients' = 'freelancers';
  peopleFreelancers: UserProfile[] = [];
  peopleClients: UserProfile[]     = [];
  isLoadingPeople = false;

  // ── Conversations ───────────────────────────────────────────────
  conversations: Conversation[] = [];
  unreadTotal    = 0;
  activeConvFilter: 'all' | 'unread' = 'all';
  blockedNoticeConvId: number | null = null;

  // ── Ban / moderation state (popup mirrors thread banner) ─────────
  isSendingBanned: boolean = false;
  bannedUntil: Date | null = null;
  banCountdown: string = '';
  private banExpiryTimer: any = null;
  private banCountdownInterval: any = null;

  // ── User identity ───────────────────────────────────────────────
  currentUserRole = 'CLIENT';

  private lastMessageId: number | null = null;
  private fetchingIds = new Set<number>();
  private subscriptions: Subscription[] = [];

  constructor(
    public  state             : MessagingStateService,
    private messageService    : MessageService,
    private convService       : ConversationService,
    private router            : Router,
    private authService       : AuthService,
    private userProfileService: UserProfileService,
    private http              : HttpClient,
    private ngZone            : NgZone
  ) {}

  // ── Lifecycle ────────────────────────────────────────────────────

  ngOnInit(): void {
    this.currentUserRole = this.authService.getUserRole() ?? 'CLIENT';
    this.loadPeopleProfiles();

    this.convService.loadAllConversations();
    this.convService.startAutoRefresh(5000);

    this.subscriptions.push(
      this.state.conversations$.subscribe(list => {
        // Enrich with real contact names from user-service for any not yet enriched
        this.enrichConversations(list);

        const valid = list.filter(c => !c.isArchived);
        this.conversations = [...valid]
          .sort((a, b) => {
            // Blocked always last
            const aB = a.status === 'BLOCKED' ? 1 : 0;
            const bB = b.status === 'BLOCKED' ? 1 : 0;
            if (aB !== bB) return aB - bB;
            // Unread conversations bubble to the top
            const aU = (a.unreadCount || 0) > 0 ? 0 : 1;
            const bU = (b.unreadCount || 0) > 0 ? 0 : 1;
            if (aU !== bU) return aU - bU;
            // Within same unread/read group: most recent first
            const da = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : new Date(a.createdAt).getTime();
            const db = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : new Date(b.createdAt).getTime();
            return db - da;
          })
          .slice(0, 6);
        this.unreadTotal = valid.filter(c => (c.unreadCount || 0) > 0).length;
      })
    );

    this.subscriptions.push(
      this.messageService.messages$.subscribe(msgs => this.onMessagesUpdate(msgs))
    );

    // Mirror moderation status so the popup shows the global suspension banner too
    this.checkModerationStatus();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(s => s.unsubscribe());
    try { document.body.style.overflow = ''; } catch (e) {}
    if (this.banExpiryTimer) clearTimeout(this.banExpiryTimer);
    if (this.banCountdownInterval) clearInterval(this.banCountdownInterval);
  }

  private checkModerationStatus(): void {
    const userId = this.authService.getNumericUserId();
    if (!userId) return;
    this.http.get<any>(`/api/messages/moderation-status?userId=${userId}`).subscribe({
      next: (status) => {
        if (status?.banned) {
          this.isSendingBanned = true;
          this.bannedUntil = status.bannedUntil ? new Date(status.bannedUntil) : null;
          if (this.bannedUntil) this.scheduleBanExpiry(this.bannedUntil);
        } else {
          this.isSendingBanned = false;
          this.bannedUntil = null;
          if (this.banExpiryTimer) { clearTimeout(this.banExpiryTimer); this.banExpiryTimer = null; }
        }
      },
      error: () => {}
    });
  }

  private scheduleBanExpiry(bannedUntil: Date): void {
    if (this.banExpiryTimer) clearTimeout(this.banExpiryTimer);
    const msRemaining = bannedUntil.getTime() - Date.now();
    if (msRemaining <= 0) {
      this.isSendingBanned = false;
      this.bannedUntil = null;
      return;
    }
    this.startBanCountdown(bannedUntil);
    this.banExpiryTimer = setTimeout(() => {
      this.ngZone.run(() => {
        this.isSendingBanned = false;
        this.bannedUntil = null;
        this.stopBanCountdown();
      });
    }, msRemaining);
  }

  private startBanCountdown(bannedUntil: Date): void {
    this.stopBanCountdown();
    this.updateBanCountdown(bannedUntil);
    this.banCountdownInterval = setInterval(() => this.updateBanCountdown(bannedUntil), 1000);
  }

  private stopBanCountdown(): void {
    if (this.banCountdownInterval) { clearInterval(this.banCountdownInterval); this.banCountdownInterval = null; }
    this.banCountdown = '';
  }

  private updateBanCountdown(bannedUntil: Date): void {
    const ms = bannedUntil.getTime() - Date.now();
    if (ms <= 0) { this.banCountdown = ''; return; }
    const sec = Math.floor(ms / 1000);
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    this.banCountdown = `Expires in ${m}:${s}`;
  }

  // ── People loading ───────────────────────────────────────────────

  private loadPeopleProfiles(): void {
    this.isLoadingPeople = true;
    forkJoin({
      freelancers: this.userProfileService.getPublicFreelancers().pipe(catchError(err => { console.error('loadPeopleProfiles freelancers error:', err); return of([] as UserProfile[]); })),
      clients:     this.userProfileService.getPublicClients().pipe(catchError(err => { console.error('loadPeopleProfiles clients error:', err); return of([] as UserProfile[]); }))
    }).subscribe({
      next: ({ freelancers, clients }) => {
        // Fetch one extra so we still have 5 visible after filtering out self
        this.peopleFreelancers = freelancers.slice(0, 6);
        this.peopleClients     = clients.slice(0, 6);
        this.isLoadingPeople   = false;
      },
      error: () => { this.isLoadingPeople = false; }
    });
  }

  // ── Computed getters ─────────────────────────────────────────────

  get activePeopleList(): UserProfile[] {
    const myId = this.authService.getNumericUserId();
    const raw  = this.activePeopleTab === 'freelancers' ? this.peopleFreelancers : this.peopleClients;
    // Always exclude the currently logged-in user from the contacts list
    const src  = myId ? raw.filter(p => p.id !== myId) : raw;
    const list = src.slice(0, 5);
    if (!this.searchTerm.trim()) return list;
    const t = this.searchTerm.trim().toLowerCase();
    return list.filter(p =>
      `${p.firstName || ''} ${p.lastName || ''}`.toLowerCase().includes(t) ||
      (p.email || '').toLowerCase().includes(t) ||
      (p.title || '').toLowerCase().includes(t)
    );
  }

  get viewAllPeoplePath(): string {
    return this.activePeopleTab === 'freelancers' ? '/freelancers' : '/clients';
  }

  get viewAllPeopleLabel(): string {
    return this.activePeopleTab === 'freelancers' ? 'All Freelancers' : 'All Clients';
  }

  get filteredConversations(): Conversation[] {
    let list = this.conversations;
    if (this.activeConvFilter === 'unread') {
      list = list.filter(c => (c.unreadCount || 0) > 0);
    }
    const t = this.searchTerm.trim().toLowerCase();
    if (t) {
      list = list.filter(c => {
        const name    = (c.otherUserFirstName || c.otherUserUsername || c.title || '').toLowerCase();
        const preview = (c.lastMessageContent || '').toLowerCase();
        return name.includes(t) || preview.includes(t);
      });
    }
    return list;
  }

  get unreadCount(): number {
    return this.conversations.filter(c => (c.unreadCount || 0) > 0).length;
  }

  // ── Panel controls ───────────────────────────────────────────────

  toggle(): void {
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      this.convService.loadAllConversations(true);
      this.clearGlow();
    }
  }

  toggleFullScreen(): void {
    this.fullScreen = !this.fullScreen;
    if (this.fullScreen) this.isOpen = true;
    try { document.body.style.overflow = this.fullScreen ? 'hidden' : ''; } catch (e) {}
  }

  onSearch(value: string): void { this.searchTerm = value || ''; }
  setConvFilter(f: 'all' | 'unread'): void { this.activeConvFilter = f; }

  // ── People actions ───────────────────────────────────────────────

  openPersonConversation(profile: UserProfile): void {
    const data: CreateConversationDTO = {
      receiverId: profile.id,
      title:      `Chat with ${(profile.firstName || '') + ' ' + (profile.lastName || '')}`.trim(),
      emojiIcon:  '💬'
    };
    this.convService.createConversation(data).subscribe({
      next: conv => {
        this.isOpen    = false;
        this.fullScreen = false;
        this.router.navigate(['/communication', conv.id]);
      },
      error: err => {
        if (err?.isBlocked && err?.conversation) {
          this.isOpen    = false;
          this.fullScreen = false;
          this.router.navigate(['/communication', err.conversation.id]);
        }
      }
    });
  }

  viewAllPeople(): void {
    this.isOpen    = false;
    this.fullScreen = false;
    this.router.navigate([this.viewAllPeoplePath]);
  }

  personAvatarUrl(profile: UserProfile): string {
    if (profile.profilePicture) {
      return profile.profilePicture.startsWith('http')
        ? profile.profilePicture
        : `http://localhost:8081${profile.profilePicture.startsWith('/') ? '' : '/'}${profile.profilePicture}`;
    }
    const name = `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || 'U';
    const bg   = this.activePeopleTab === 'clients' ? '4f46e5' : '0ea5e9';
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${bg}&color=fff&size=64`;
  }

  // ── Conversation actions ─────────────────────────────────────────

  openConversation(conv: Conversation): void {
    if (conv.status === 'BLOCKED') {
      this.blockedNoticeConvId = conv.id;
      setTimeout(() => { this.blockedNoticeConvId = null; }, 3500);
      return;
    }
    this.isOpen    = false;
    this.fullScreen = false;
    this.router.navigate(['/communication', conv.id]);
  }

  goToBlockedTab(): void {
    this.isOpen    = false;
    this.fullScreen = false;
    this.blockedNoticeConvId = null;
    this.router.navigate(['/communication'], { queryParams: { filter: 'blocked' } });
  }

  isBlocked(conv: Conversation): boolean { return conv.status === 'BLOCKED'; }

  goToMessenger(): void {
    this.isOpen    = false;
    this.fullScreen = false;
    this.router.navigate(['/communication']);
  }

  // ── Enrichment ───────────────────────────────────────────────────

  /** Fetches the real profile of the OTHER participant for each non-enriched conversation. */
  private enrichConversations(convs: Conversation[]): void {
    const myId = this.convService.getCurrentUserId();
    if (!myId) return;
    convs.forEach(conv => {
      // Guard 1: already enriched (names present in state)
      if (conv.otherUserFirstName || conv.otherUserLastName) return;
      // Guard 2: shared singleton Set — prevents duplicate calls from any component
      if (this.state.enrichingIds.has(conv.id)) return;
      this.state.enrichingIds.add(conv.id); // claim this ID before the async call

      const otherId = myId === conv.creatorId ? conv.receiverId : conv.creatorId;
      if (!otherId) return;
      this.subscriptions.push(
        this.userProfileService.getUserById(otherId).subscribe({
          next: profile => {
            this.state.patchConversation(conv.id, {
              otherUserFirstName      : profile.firstName      ?? undefined,
              otherUserLastName       : profile.lastName       ?? undefined,
              otherUserUsername       : profile.email          ?? undefined,
              otherUserProfilePicture : profile.profilePicture ?? undefined,
              otherUserId             : profile.id
            });
          },
          error: () => {
            // On error, remove from set so the call can be retried on next refresh
            this.state.enrichingIds.delete(conv.id);
          }
        })
      );
    });
  }

  // ── Display helpers ──────────────────────────────────────────────

  convInitials(conv: Conversation): string {
    const n = this.contactName(conv);
    if (!n) return '?';
    const words = n.trim().split(/\s+/);
    return words.length >= 2
      ? (words[0][0] + words[1][0]).toUpperCase()
      : n.substring(0, 2).toUpperCase();
  }

  /** Returns the contact's display name, stripping the "Chat with " prefix stored in title. */
  contactName(conv: Conversation): string {
    if (conv.otherUserFirstName || conv.otherUserLastName)
      return [conv.otherUserFirstName, conv.otherUserLastName].filter(Boolean).join(' ');
    if (conv.otherUserUsername)
      return conv.otherUserUsername.includes('@')
        ? conv.otherUserUsername.split('@')[0]
        : conv.otherUserUsername;
    const t = conv.title || '';
    return t.startsWith('Chat with ') ? t.substring(10) : (t || 'Conversation');
  }

  private hasValidName(conv: Conversation): boolean {
    const fn = (conv.otherUserFirstName || '').trim().toLowerCase();
    const ln = (conv.otherUserLastName  || '').trim().toLowerCase();
    const un = (conv.otherUserUsername  || '').trim();
    const tt = (conv.title              || '').trim();
    if ((fn === 'null' || fn === '') && (ln === 'null' || ln === '') && !un && !tt) return false;
    return true;
  }

  preview(conv: Conversation): string {
    if (this.isBlocked(conv)) return '🚫 Blocked contact';
    let txt = conv.lastMessageContent;
    let senderId = conv.lastMessageSenderId;
    if (!txt) {
      const msgs = this.messageService.getMessagesSnapshot()
        .filter(m => m.conversationId === conv.id && !m.isDeleted && m.deliveryStatus !== 'BLOCKED');
      if (msgs.length) {
        const last = msgs.sort((a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
        txt = last.content;
        senderId = last.senderId;
      }
    }
    if (!txt) {
      if (!this.fetchingIds.has(conv.id)) {
        this.fetchingIds.add(conv.id);
        this.messageService.getMessagesByConversation(conv.id).subscribe({
          next: res => {
            const arr = (res?.content || []).filter((m: any) => !m.isDeleted && m.deliveryStatus !== 'BLOCKED');
            if (arr.length) {
              const last = arr.sort((a: any, b: any) =>
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
              try { this.state.patchConversation(conv.id, { lastMessageContent: last.content, lastMessageSenderId: last.senderId, lastMessageAt: last.createdAt }); }
              catch (e) {}
            }
            this.fetchingIds.delete(conv.id);
          },
          error: () => { this.fetchingIds.delete(conv.id); }
        });
      }
      return 'Loading...';
    }
    const myId = this.convService.getCurrentUserId();
    const prefix = senderId && myId && senderId === myId ? 'You: ' : '';
    const replyMatch = txt.match(/^\u21a9\ufe0f @[^ \n]+\n(.+)$/s);
    if (replyMatch) txt = replyMatch[1];
    if (txt.trim().startsWith('{')) {
      try {
        const data = JSON.parse(txt);
        if (data.callType !== undefined && data.status !== undefined) {
          const icon  = data.callType === 'video' ? '📹' : '📞';
          const label = data.callType === 'video' ? 'Video call' : 'Voice call';
          const sm: Record<string, string> = { completed: 'Finished', missed: 'Missed', declined: 'Declined', cancelled: 'Cancelled' };
          return `${prefix}${icon} ${label} · ${sm[data.status] || data.status}`;
        }
      } catch {}
    }
    if (txt.startsWith('/api/messages/files/') || (txt.startsWith('http') && txt.includes('/files/'))) return `${prefix}📎 Attachment`;
    if (txt.match(/\.(jpg|jpeg|png|gif|webp|bmp)$/i)) return `${prefix}📷 Image`;
    if (txt.match(/\.(mp4|mov|avi|webm)$/i))          return `${prefix}🎥 Video`;
    if (txt.match(/\.(mp3|ogg|wav|m4a)$/i))            return `${prefix}🎤 Voice message`;
    const truncated = txt.length > 45 ? txt.substring(0, 42) + '...' : txt;
    return `${prefix}${truncated}`;
  }

  avatarUrl(conv: Conversation): string | null {
    if (!conv.otherUserProfilePicture) return null;
    return conv.otherUserProfilePicture.startsWith('http')
      ? conv.otherUserProfilePicture
      : `${environment.apiBaseUrl}${conv.otherUserProfilePicture.startsWith('/') ? '' : '/'}${conv.otherUserProfilePicture}`;
  }

  timeLabel(date?: Date | string): string {
    if (!date) return '';
    const d   = new Date(date);
    const now = new Date();
    const min = Math.floor((now.getTime() - d.getTime()) / 60000);
    if (min < 1)  return 'Now';
    if (min < 60) return `${min}m`;
    const hours = Math.floor(min / 60);
    if (hours < 24) return `${hours}h`;
    const today     = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    const ds        = d.toDateString();
    if (ds === today)     return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    if (ds === yesterday) return 'Yesterday';
    return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
  }

  // ── Notification ─────────────────────────────────────────────────

  private onMessagesUpdate(msgs: Message[]): void {
    if (!msgs || msgs.length === 0) return;
    const last = msgs.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
    if (!last) return;
    if (this.lastMessageId && last.id !== this.lastMessageId) {
      const cu = this.convService.getCurrentUserIdAsNumber();
      if (last.senderId !== cu && !last.isDeleted) this.triggerNotification();
    }
    this.lastMessageId = last.id;
  }

  private triggerNotification(): void {
    this.glow = true;
    this.playPing();
    setTimeout(() => this.glow = false, 3500);
  }

  private clearGlow(): void { this.glow = false; }

  private playPing(): void {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const now = ctx.currentTime;
      const makeTone = (freq: number, start: number, dur: number) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'sine';
        o.frequency.value = freq;
        g.gain.value = 0;
        o.connect(g);
        g.connect(ctx.destination);
        g.gain.setValueAtTime(0, now + start);
        g.gain.linearRampToValueAtTime(0.12, now + start + 0.01);
        g.gain.exponentialRampToValueAtTime(0.001, now + start + dur - 0.02);
        o.start(now + start);
        o.stop(now + start + dur);
      };
      makeTone(950, 0, 0.18);
      makeTone(1200, 0.16, 0.18);
    } catch (e) {}
  }
}
