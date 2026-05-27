import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { environment } from '../../../../../environments/environment';
import { Subject, takeUntil } from 'rxjs';
import { ConversationService } from '../../../../core/services/conversation.service';
import { MessagingStateService } from '../../../../core/services/messaging-state.service';
import { MessageService } from '../../../../core/services/message.service';
import { UserProfileService } from '../../../../core/services/user-profile.service';
import { ThemeService } from '../../../../core/services/theme.service';
import { Conversation } from '../../../../core/models/conversation.model';
import {
  Plus, Search, Star, Archive,
  Trash2, Pin, Edit2, Check, MoreHorizontal, X, RefreshCw,
  ShieldAlert, ShieldOff
} from 'lucide-angular';

@Component({
  selector: 'app-conversation-list',
  standalone: false,
  templateUrl: './conversation-list.component.html',
  styleUrls: ['./conversation-list.component.css']
})
export class ConversationListComponent implements OnInit, OnDestroy {

  filteredConversations: Conversation[] = [];

  searchTerm  : string = '';
  filterStatus: 'all' | 'active' | 'favorite' | 'archived' | 'blocked' = 'all';
  sortBy      : 'date' | 'priority' = 'date';

  isLoading       : boolean = false;
  selectedConvId  : number | null = null;
  activeMenuId    : number | null = null;

  showDeleteModal : boolean = false;
  showRenameModal : boolean = false;
  showBlockModal  : boolean = false;

  target      : Conversation | null = null;
  renameValue : string = '';
  renameEmoji : string = '';

  quickEmojis = ['💼','🎯','💡','🚀','⭐','🔥','💬','📱','🎨','🌟','✨','💪'];

  tabs = [
    { key: 'all'      as const, label: 'All'      },
    { key: 'active'   as const, label: 'Active'   },
    { key: 'favorite' as const, label: 'Favorites'},
    { key: 'archived' as const, label: 'Archived' },
    { key: 'blocked'  as const, label: 'Blocked'  }
  ];

  // Icons
  readonly RefreshIcon        = RefreshCw;
  readonly PlusIcon           = Plus;
  readonly SearchIcon         = Search;
  readonly XIcon              = X;
  readonly StarIcon           = Star;
  readonly ArchiveIcon        = Archive;
  readonly Trash2Icon         = Trash2;
  readonly PinIcon            = Pin;
  readonly EditIcon           = Edit2;
  readonly CheckIcon          = Check;
  readonly MoreHorizontalIcon = MoreHorizontal;
  readonly BlockIcon          = ShieldAlert;
  readonly UnblockIcon        = ShieldOff;

  /** Stable "now" snapshot refreshed every 60 s — prevents NG0100 in timeLabel(). */
  now = new Date();
  private tickInterval: any;

  private destroy$ = new Subject<void>();

  constructor(
    private router              : Router,
    private route               : ActivatedRoute,
    private conversationService : ConversationService,
    public  state               : MessagingStateService,
    private messageService      : MessageService,
    private userProfileService  : UserProfileService,
    public  theme               : ThemeService
  ) {}

  ngOnInit(): void {
    // Refresh the "now" snapshot every 60 s so timeLabel() stays accurate
    // without triggering NG0100 (the value is stable within each CD cycle).
    this.tickInterval = setInterval(() => { this.now = new Date(); }, 60_000);

    this.conversationService.loadAllConversations();

    this.state.conversations$.pipe(takeUntil(this.destroy$)).subscribe(convs => {
      this.enrichConversationsWithUserProfiles(convs);
      this.applyFilters();
    });

    this.state.isLoading$.pipe(takeUntil(this.destroy$)).subscribe(loading => {
      this.isLoading = loading;
    });

    this.route.firstChild?.params.pipe(takeUntil(this.destroy$)).subscribe(params => {
      this.selectedConvId = params['id'] ? +params['id'] : null;
    });
  }

  ngOnDestroy(): void {
    clearInterval(this.tickInterval);
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── REFRESH ───────────────────────────────────────────────────
  refresh(): void {
    this.conversationService.loadAllConversations(true);
  }

  // ── ENRICH conversations with the other participant's real name ─
  private enrichConversationsWithUserProfiles(convs: Conversation[]): void {
    const myId = this.conversationService.getCurrentUserId();
    if (!myId) return;
    convs.forEach(conv => {
      // Guard 0: detect stale wrong enrichment — if we previously fetched OUR OWN
      // profile as the "other user" (e.g. due to a stale numeric ID in localStorage),
      // clear it so the conversation shows the raw title instead of our own name.
      if (conv.otherUserId && conv.otherUserId === myId) {
        this.state.enrichingIds.add(conv.id); // mark handled — prevents retry loop
        this.state.patchConversation(conv.id, {
          otherUserFirstName: undefined as any, otherUserLastName: undefined as any,
          otherUserUsername: undefined as any, otherUserProfilePicture: undefined as any,
          otherUserId: undefined as any
        });
        return;
      }
      // Guard 1: already enriched (names present in state)
      if (conv.otherUserFirstName || conv.otherUserLastName) return;
      // Guard 2: shared singleton Set — prevents duplicate calls from any component
      if (this.state.enrichingIds.has(conv.id)) return;

      const otherId = myId === conv.creatorId ? conv.receiverId : conv.creatorId;
      // Skip self-conversations (creatorId === receiverId === myId) — mark as handled
      if (!otherId || otherId === myId) {
        this.state.enrichingIds.add(conv.id);
        return;
      }

      this.state.enrichingIds.add(conv.id); // claim this ID before the async call
      this.userProfileService.getUserById(otherId).pipe(takeUntil(this.destroy$)).subscribe({
        next: profile => {
          // Safety: if the API returned our own profile (wrong otherId), skip and allow retry
          if (profile.id === myId) {
            this.state.enrichingIds.delete(conv.id);
            return;
          }
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
      });
    });
  }

  // ── FILTERS ───────────────────────────────────────────────────
  applyFilters(): void {
    let filtered = [...this.state.conversations];

    switch (this.filterStatus) {
      case 'blocked':
        // Only show conversations WHERE I AM THE BLOCKER
        filtered = filtered.filter(c => this.isBlockedByMe(c));
        break;
      case 'archived':
        // Archived but NOT blocked-by-me (archived blocked-by-other still visible in all)
        filtered = filtered.filter(c => c.isArchived && !this.isBlockedByMe(c));
        break;
      case 'favorite':
        // Active + favourite (exclude archived and blocked-by-me)
        // blocked-by-other conversations CAN be favourites
        filtered = filtered.filter(c => !c.isArchived && !this.isBlockedByMe(c) && c.isFavorite);
        break;
      case 'active':
        // Non-archived, not blocked-by-me (blocked-by-other stays in active list)
        filtered = filtered.filter(c => !c.isArchived && !this.isBlockedByMe(c));
        break;
      default: // 'all'
        // Everything except archived and blocked-by-me
        // Blocked-by-other stays in the normal inbox (with a red marker)
        filtered = filtered.filter(c => !c.isArchived && !this.isBlockedByMe(c));
        break;
    }

    if (this.searchTerm?.trim()) {
      const term = this.searchTerm.toLowerCase().trim();
      filtered = filtered.filter(c =>
        this.name(c).toLowerCase().includes(term)    ||
        (c.title || '').toLowerCase().includes(term) ||
        this.preview(c).toLowerCase().includes(term)
      );
    }

    this.filteredConversations = this.conversationService.sortConversations(filtered, this.sortBy);
  }

  onSearch(term: string): void { this.searchTerm = term; this.applyFilters(); }

  changeFilter(f: 'all' | 'active' | 'favorite' | 'archived' | 'blocked'): void {
    this.filterStatus = f;
    this.applyFilters();
  }

  changeSort(s: 'date' | 'priority'): void { this.sortBy = s; this.applyFilters(); }

  // ── NAVIGATION ────────────────────────────────────────────────
  open(conv: Conversation): void {
    // Blocker cannot open from Blocked tab (they manage it from the list).
    // The blocked receiver CAN open to see the red banner.
    if (this.isBlockedByMe(conv)) return;
    this.selectedConvId = conv.id;
    this.state.setSelectedId(conv.id);
    this.closeMenus();
    this.playClickSound();
    this.router.navigate(['/communication', conv.id]);
  }

  viewProfile(event: Event, conv: Conversation): void {
    event.stopPropagation();
    this.closeMenus();
    const otherId = conv.otherUserId;
    if (otherId) {
      this.router.navigate(['/freelancers', otherId]);
    }
  }

  private playClickSound(): void {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const now = ctx.currentTime;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(600, now);
      o.frequency.exponentialRampToValueAtTime(300, now + 0.08);
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(0.10, now + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
      o.connect(g);
      g.connect(ctx.destination);
      o.start(now);
      o.stop(now + 0.1);
    } catch (e) {}
  }

  isSelected(conv: Conversation): boolean { return this.selectedConvId === conv.id; }
  goFreelancers(): void { this.router.navigate(['/freelancers']); }

  // ── STANDARD ACTIONS ──────────────────────────────────────────
  toggleFav(event: Event, conv: Conversation): void {
    event.stopPropagation();
    this.closeMenus();

    // Optimistic update
    const newValue = !conv.isFavorite;
    this.state.patchConversation(conv.id, { isFavorite: newValue });
    this.applyFilters();

    this.conversationService.toggleFavorite(conv.id, conv.isFavorite).subscribe({
      error: err => {
        console.error('toggleFavorite failed — rolling back', err);
        this.state.patchConversation(conv.id, { isFavorite: conv.isFavorite });
        this.applyFilters();
      }
    });
  }

  // ── FIX: toggleArchive with immediate optimistic update ───────
  toggleArchive(event: Event, conv: Conversation): void {
    event.stopPropagation();
    this.closeMenus();

    const newArchivedValue = !conv.isArchived;

    // ✅ FIX 1: Optimistic update BEFORE HTTP call so UI reflects change instantly
    this.state.patchConversation(conv.id, {
      isArchived: newArchivedValue,
      archivedAt: newArchivedValue ? new Date() : undefined
    });

    // ✅ FIX 2: Re-apply filters immediately so conversation moves to/from Archived tab
    this.applyFilters();

    // If the currently selected conversation is archived from the 'all'/'active' view,
    // navigate away from it
    if (newArchivedValue && this.selectedConvId === conv.id &&
      (this.filterStatus === 'all' || this.filterStatus === 'active')) {
      this.selectedConvId = null;
      this.router.navigate(['/communication']);
    }

    // HTTP call — rollback on failure
    this.conversationService.toggleArchive(conv.id, conv.isArchived).subscribe({
      error: err => {
        console.error('toggleArchive failed — rolling back', err);
        // Rollback optimistic change
        this.state.patchConversation(conv.id, {
          isArchived: conv.isArchived,
          archivedAt: conv.archivedAt
        });
        this.applyFilters();
      }
    });
  }

  togglePin(event: Event, conv: Conversation): void {
    event.stopPropagation();
    this.conversationService.togglePinConversation(conv.id).subscribe();
    this.closeMenus();
    this.applyFilters();
  }

  // ── BLOCK / UNBLOCK ───────────────────────────────────────────
  /** Any blocked status (blocker or blocked user). */
  isBlockedStatus(conv: Conversation): boolean {
    return conv.status === 'BLOCKED';
  }

  /** True only when the CURRENT user is the one who blocked (backend sets blockedByMe). */
  isBlockedByMe(conv: Conversation): boolean {
    const myId = this.conversationService.getCurrentUserId();
    return conv.status === 'BLOCKED' &&
      (conv.blockedByMe === true || conv.blockedById === myId);
  }

  /** True when conversation is blocked and the current user is the BLOCKED party. */
  isBlockedByOther(conv: Conversation): boolean {
    return conv.status === 'BLOCKED' && !this.isBlockedByMe(conv);
  }

  /** @deprecated kept for template compat — use isBlockedByMe / isBlockedByOther */
  isBlocked(conv: Conversation): boolean {
    return this.isBlockedByMe(conv);
  }

  blockedCount(): number {
    return this.state.conversations.filter(c => this.isBlockedByMe(c)).length;
  }

  archivedCount(): number {
    return this.state.conversations.filter(c => c.isArchived && !this.isBlockedByMe(c)).length;
  }

  openBlock(event: Event, conv: Conversation): void {
    event.stopPropagation();
    this.target = conv;
    this.showBlockModal = true;
    this.closeMenus();
  }

  cancelBlock(): void {
    this.showBlockModal = false;
    this.target = null;
  }

  confirmBlock(): void {
    if (!this.target) return;
    const conv = this.target;
    this.cancelBlock();

    // Optimistic update
    this.state.patchConversation(conv.id, {
      status: 'BLOCKED',
      blockedById: this.conversationService.getCurrentUserId()
    });
    this.applyFilters();

    if (this.selectedConvId === conv.id) {
      this.selectedConvId = null;
      this.router.navigate(['/communication']);
    }

    this.conversationService.blockConversation(conv.id).subscribe({
      error: err => {
        console.error('blockConversation failed — rolling back', err);
        this.state.patchConversation(conv.id, { status: 'ACTIVE', blockedById: undefined });
        this.applyFilters();
      }
    });
  }

  unblock(event: Event, conv: Conversation): void {
    event.stopPropagation();
    this.closeMenus();

    // Optimistic
    this.state.patchConversation(conv.id, { status: 'ACTIVE', blockedById: undefined });
    this.applyFilters();

    this.conversationService.unblockConversation(conv.id).subscribe({
      error: err => {
        console.error('unblockConversation failed — rolling back', err);
        this.state.patchConversation(conv.id, {
          status: 'BLOCKED',
          blockedById: this.conversationService.getCurrentUserId()
        });
        this.applyFilters();
      }
    });
  }

  // ── DELETE MODAL ──────────────────────────────────────────────
  openDelete(event: Event, conv: Conversation): void {
    event.stopPropagation();
    this.target = conv;
    this.showDeleteModal = true;
    this.closeMenus();
  }

  cancelDelete(): void { this.showDeleteModal = false; this.target = null; }

  confirmDelete(): void {
    if (!this.target) return;
    const id = this.target.id;
    this.cancelDelete();

    this.state.removeConversation(id);
    this.applyFilters();

    if (this.selectedConvId === id) {
      this.selectedConvId = null;
      this.router.navigate(['/communication']);
    }

    this.conversationService.deleteConversation(id).subscribe({
      error: err => {
        if (err.status !== 404) {
          console.error('deleteConversation failed — restoring', err);
          this.conversationService.loadAllConversations(true);
        }
      }
    });
  }

  // ── RENAME MODAL ──────────────────────────────────────────────
  openRename(event: Event, conv: Conversation): void {
    event.stopPropagation();
    this.target      = conv;
    this.renameValue = conv.title || this.name(conv);
    this.renameEmoji = conv.emojiIcon || '';
    this.showRenameModal = true;
    this.closeMenus();
  }

  cancelRename(): void {
    this.showRenameModal = false;
    this.target = null;
    this.renameValue = '';
    this.renameEmoji = '';
  }

  confirmRename(): void {
    if (!this.target || !this.renameValue.trim()) return;
    this.conversationService.updateConversation(this.target.id, {
      title    : this.renameValue.trim(),
      emojiIcon: this.renameEmoji
    }).subscribe({
      next : () => this.cancelRename(),
      error: err => console.error('renameConversation failed', err)
    });
  }

  // ── MENU ──────────────────────────────────────────────────────
  toggleMenu(event: Event, id: number): void {
    event.stopPropagation();
    this.activeMenuId = this.activeMenuId === id ? null : id;
  }

  closeMenus(): void { this.activeMenuId = null; }

  // ── DISPLAY HELPERS ───────────────────────────────────────────
  name(conv: Conversation): string {
    if (conv.otherUserFirstName || conv.otherUserLastName)
      return [conv.otherUserFirstName, conv.otherUserLastName].filter(Boolean).join(' ');
    if (conv.otherUserUsername)
      return conv.otherUserUsername.includes('@')
        ? conv.otherUserUsername.split('@')[0]
        : conv.otherUserUsername;
    // Strip the "Chat with " prefix that the backend stores in the title field
    const t = conv.title || 'User';
    return t.startsWith('Chat with ') ? t.substring(10) : t;
  }

  avatar(conv: Conversation): string | null {
    if (!conv.otherUserProfilePicture) return null;
    return conv.otherUserProfilePicture.startsWith('http')
      ? conv.otherUserProfilePicture
      : `${environment.apiBaseUrl}${conv.otherUserProfilePicture.startsWith('/') ? '' : '/'}${conv.otherUserProfilePicture}`;
  }

  preview(conv: Conversation): string {
    if (this.isBlockedByMe(conv))    return '🚫 Blocked contact';
    if (this.isBlockedByOther(conv)) return '⛔ You have been blocked';

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
    if (!txt) return 'New conversation';

    const myId = this.conversationService.getCurrentUserId();
    const prefix = senderId && myId && senderId === myId ? 'You: ' : '';

    const replyMatch = txt.match(/^↩️ @[^ \n]+\n(.+)$/s);
    if (replyMatch) txt = replyMatch[1];

    // Appel CALL : JSON {"callType":"audio","status":"missed",...}
    if (txt.trim().startsWith('{')) {
      try {
        const data = JSON.parse(txt);
        if (data.callType !== undefined && data.status !== undefined) {
          const icon = data.callType === 'video' ? '📹' : '📞';
          const label = data.callType === 'video' ? 'Video call' : 'Voice call';
          const statusMap: Record<string, string> = {
            completed: 'Completed', missed: 'Missed', declined: 'Declined', cancelled: 'Canceled'
          };
          return `${prefix}${icon} ${label} · ${statusMap[data.status] || data.status}`;
        }
      } catch {}
    }

    if (txt.startsWith('/api/messages/files/') || (txt.startsWith('http') && txt.includes('/files/')))
      return `${prefix}📎 Attached file`;
    if (txt.match(/\.(jpg|jpeg|png|gif|webp|bmp)$/i) || txt.includes('image/')) return `${prefix}📷 Image`;
    if (txt.match(/\.(mp4|mov|avi|webm)$/i)) return `${prefix}🎥 Video`;
    if (txt.match(/\.(mp3|ogg|wav|m4a|webm)$/i) || txt.includes('audio/')) return `${prefix}🎤 Voice message`;

    const truncated = txt.length > 45 ? txt.substring(0, 42) + '...' : txt;
    return `${prefix}${truncated}`;
  }

  timeLabel(date?: Date | string): string {
    if (!date) return '';
    const d   = new Date(date);
    const now = this.now;   // stable snapshot — never calls new Date() during CD
    const min = Math.floor((now.getTime() - d.getTime()) / 60000);

    if (min < 1)  return 'Now';
    if (min < 60) return `${min}m`;

    const today     = now.toDateString();
    const yesterday = new Date(now.getTime() - 86400000).toDateString();
    const ds        = d.toDateString();

    if (ds === today)     return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    if (ds === yesterday) return 'Yesterday';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  unread(conv: Conversation): number    { return this.isBlockedByMe(conv) ? 0 : (conv.unreadCount || 0); }
  isPinned(conv: Conversation): boolean { return this.state.isPinned(conv.id); }

  getInitials(conversation: any): string {
    const n = this.name(conversation);
    if (!n) return '??';
    const words = n.trim().split(/\s+/);
    return words.length >= 2
      ? (words[0][0] + words[1][0]).toUpperCase()
      : n.substring(0, 2).toUpperCase();
  }

  isActive(conversation: Conversation): boolean {
    if (!conversation || conversation.isArchived || this.isBlockedStatus(conversation)) return false;
    if ((conversation.unreadCount || 0) > 0) return true;
    if (!conversation.lastMessageAt) return false;
    const diffMin = (Date.now() - new Date(conversation.lastMessageAt).getTime()) / 60000;
    return diffMin <= 10;
  }
}
