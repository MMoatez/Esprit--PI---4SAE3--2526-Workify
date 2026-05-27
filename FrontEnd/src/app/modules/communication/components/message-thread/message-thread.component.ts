import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked, ChangeDetectorRef, NgZone } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil, switchMap, debounceTime, forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ConversationService } from '../../../../core/services/conversation.service';
import { MessagingStateService } from '../../../../core/services/messaging-state.service';
import { MessageService } from '../../../../core/services/message.service';
import { RagSuggestionService, SuggestionDto } from '../../../../core/services/rag-suggestion.service';
import { ConversationSummaryService } from '../../../../core/services/conversation-summary.service';
import { NoteService, ConversationNote } from '../../../../core/services/note.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ChatThemeService, ChatTheme } from '../../../../core/services/chat-theme.service';
import {
  Conversation, Message, MessageContentType
} from '../../../../core/models/conversation.model';
import {
  Send, Smile, Paperclip, MoreVertical, ArrowLeft, Star,
  Trash2, Edit, Check, CheckCheck, Pin, Reply, X, Archive,
  ShieldOff, Phone, Video, PhoneOff, PhoneMissed, AlertTriangle
} from 'lucide-angular';
import { Mic } from 'lucide-angular';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';

const API_BASE = environment.communicationApiBaseUrl;

@Component({
  selector: 'app-message-thread',
  standalone: false,
  templateUrl: './message-thread.component.html',
  styleUrls: ['./message-thread.component.css']
})
export class MessageThreadComponent implements OnInit, OnDestroy, AfterViewChecked {
  // Ajout des méthodes pour le menu Messenger
  editConversation(): void {
    // Customize as needed (open a modal, etc.)
    alert('Edit conversation feature (to implement)');
  }

  muteConversation(): void {
    // Customize as needed (mute logic)
    alert('Mute conversation feature (to implement)');
  }

  /** UI helpers for priority display */
  getPriorityLabel(): string {
    if (!this.conversation) return '';
    const lvl = (this.conversation.priorityLevel || 'MEDIUM').toUpperCase();
    switch (lvl) {
      case 'HIGH': return 'Haute';
      case 'LOW': return 'Basse';
      default: return 'Moyenne';
    }
  }

  getPriorityClass(): string {
    if (!this.conversation) return 'priority-medium';
    const lvl = (this.conversation.priorityLevel || 'MEDIUM').toUpperCase();
    return lvl === 'HIGH' ? 'priority-high' : lvl === 'LOW' ? 'priority-low' : 'priority-medium';
  }

  /** Toggle archive (UI-optimistic) */
  toggleArchiveUI(): void {
    if (!this.conversation) return;
    const convoId = this.conversation.id;
    const prev = this.conversation.isArchived;
    // Optimistic update
    this.state.patchConversation(convoId, { isArchived: !prev, archivedAt: !prev ? new Date() : undefined });
    this.conversation.isArchived = !prev;
    this.conversation.archivedAt = !prev ? new Date() : undefined;

    this.conversationService.toggleArchive(convoId, prev).pipe(takeUntil(this.destroy$)).subscribe({
      next: (updated) => {
        this.conversation = { ...this.conversation!, ...updated } as Conversation;
        this.showToast(updated.isArchived ? 'Conversation archived' : 'Conversation restored', 'success');
      },
      error: (err) => {
        // rollback optimistic
        this.state.patchConversation(convoId, { isArchived: prev });
        if (this.conversation) { this.conversation.isArchived = prev; }
        console.error('Archive error:', err);
        this.showToast('Error archiving conversation', 'error');
      }
    });
  }

  /** When user opens an archived conversation we unarchive it and reset priority to MEDIUM */
  private ensureUnarchiveOnOpen(): void {
    if (!this.conversation) return;
    if (!this.conversation.isArchived) return;
    // Explicitly unarchive and set priority to MEDIUM
    const convoId = this.conversation.id;
    this.conversationService.updateConversation(convoId, { isArchived: false, priorityLevel: 'MEDIUM' })
      .pipe(takeUntil(this.destroy$)).subscribe({
        next: (updated) => {
          this.state.patchConversation(convoId, { isArchived: updated.isArchived, priorityLevel: updated.priorityLevel });
          this.conversation = { ...this.conversation!, ...updated } as Conversation;
          this.showToast('Conversation unarchived', 'info');
        },
        error: () => { /* non-blocking */ }
      });
  }
  @ViewChild('messagesContainer') messagesContainer!: ElementRef;
  @ViewChild('messageInputEl')    messageInput!: ElementRef;
  @ViewChild('fileInputRef')      fileInputEl!: ElementRef<HTMLInputElement>;

  conversation: Conversation | null = null;
  messages: Message[] = [];
  get currentUserId(): number { return this.conversationService.getCurrentUserIdAsNumber(); }

  messageText: string = '';
  selectedFile: File | null = null;
  isSending: boolean = false;
  isLoading: boolean = false;
  // Recording state
  isRecording: boolean = false;
  private mediaRecorder: any = null;
  private recordedChunks: Blob[] = [];
  recordedUrl: string | null = null;
  recordingStartTs: number | null = null;
  recordingTimer: string = '00:00';
  private recordingInterval: any = null;

  replyingTo: Message | null = null;
  editingMessageId: number | null = null;
  editingMessageText: string = '';

  // ── RAG Suggestion state ──────────────────────────────────────
  ragSuggestions: SuggestionDto[] = [];
  isLoadingSuggestions: boolean = false;
  currentUserRole: string = 'CLIENT'; // set from JWT in ngOnInit via AuthService.getUserRole()
  private ragSubject$ = new Subject<string>();
  /** Tracks how many times each normalized draft key has been sent → used for pool rotation. */
  private suggestionOffsets = new Map<string, number>();

  showEmojiPicker: boolean = false;
  emojis: string[] = ['👍','❤️','😂','😮','😢','😡','🎉','🔥','✅','🙏','💯','🤔'];
  reactionPickerMessageId: number | null = null;
  activeMenuMessageId: number | null = null;
  showHeaderMenu: boolean = false;
  menuDropdownStyle: { top: string; left: string } = { top: '0px', left: '0px' };

  // ── Audio player state ────────────────────────────────────────
  playingAudioId: number | null = null;
  private audioElements: Map<number, HTMLAudioElement> = new Map();
  private audioProgress: Map<number, number> = new Map();
  private audioDuration: Map<number, number> = new Map();
  private audioCurrentTime: Map<number, number> = new Map();
  private waveBarCache: Map<number, number[]> = new Map();

  // ── Modal states ──────────────────────────────────────────────
  showRenameModal : boolean = false;
  renameValue     : string  = '';
  renameEmoji     : string  = '';
  readonly quickEmojis = ['💼','🎯','💡','🚀','⭐','🔥','💬','📱','🎨','🌟','✨','💪'];

  showDeleteModal : boolean = false;
  showBlockModal  : boolean = false;

  readonly SendIcon           = Send;
  readonly SmileIcon          = Smile;
  readonly PaperclipIcon      = Paperclip;
  readonly MicIcon            = Mic;
  readonly MoreVerticalIcon   = MoreVertical;
  readonly ArrowLeftIcon      = ArrowLeft;
  readonly StarIcon           = Star;
  readonly Trash2Icon         = Trash2;
  readonly EditIcon           = Edit;
  readonly CheckIcon          = Check;
  readonly CheckCheckIcon     = CheckCheck;
  readonly PinIcon            = Pin;
  readonly ReplyIcon          = Reply;
  readonly XIcon              = X;
  readonly ArchiveIcon        = Archive;
  readonly BlockIcon          = ShieldOff;
  readonly PhoneIcon          = Phone;
  readonly VideoIcon          = Video;
  readonly PhoneOffIcon       = PhoneOff;
  readonly PhoneMissedIcon    = PhoneMissed;
  readonly AlertTriangleIcon  = AlertTriangle;

  // ── Ban / moderation state ─────────────────────────────────────────────
  isSendingBanned: boolean = false;
  bannedUntil: Date | null = null;
  private banExpiryTimer: any = null;
  banCountdown: string = '';
  private banCountdownInterval: any = null;
  // Fallback monitor: polls refresh endpoint while ban is active to ensure
  // expired bans are processed even if the browser sleeps or timers drift.
  private banMonitorInterval: any = null;

  // ── AI Summary state ──────────────────────────────────────
  summaryText     : string | null = null;
  summaryLoading  : boolean = false;
  summaryExpanded : boolean = true;

  // ── Notes state ────────────────────────────────────────────
  showNotesPanel    : boolean = false;
  notes             : ConversationNote[] = [];
  notesLoading      : boolean = false;
  noteSaving        : boolean = false;
  newNoteContent    : string = '';
  editingNoteId     : number | null = null;
  editingNoteContent: string = '';

  generateSummary(): void {
    if (!this.conversation || this.summaryLoading) return;
    this.summaryLoading = true;
    this.summaryText    = null;
    this.summaryExpanded = true;
    this.summaryService.getSummary(this.conversation.id, this.currentUserId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next : (text: string) => { this.summaryText = text; this.summaryLoading = false; },
        error: ()   => { this.summaryText = 'Unable to generate summary.'; this.summaryLoading = false; }
      });
  }

  dismissSummary(): void  { this.summaryText = null; }
  toggleSummary():  void  { this.summaryExpanded = !this.summaryExpanded; }

  // ── Notes ──────────────────────────────────────────────────
  toggleNotes(): void {
    this.showNotesPanel = !this.showNotesPanel;
    if (this.showNotesPanel) {
      this.triggerAutoGenerate();
    }
  }

  /** Triggers smart auto-generation for today (idempotent), then loads all notes. */
  private triggerAutoGenerate(): void {
    if (!this.conversation) return;
    this.notesLoading = true;
    const today = new Date().toISOString().split('T')[0]; // yyyy-MM-dd
    this.noteService.generateNotes(this.conversation.id, this.currentUserId, today)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next : (notes) => { this.notes = notes; this.notesLoading = false; },
        error: ()      => {
          this.noteService.getNotes(this.conversation!.id, this.currentUserId)
            .pipe(takeUntil(this.destroy$))
            .subscribe({ next: n => { this.notes = n; this.notesLoading = false; }, error: () => { this.notesLoading = false; } });
        }
      });
  }

  /** Manually refresh — fetches current list without re-running extraction. */
  refreshNotes(): void {
    if (!this.conversation || this.notesLoading) return;
    this.notesLoading = true;
    this.noteService.getNotes(this.conversation.id, this.currentUserId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next : (notes) => { this.notes = notes; this.notesLoading = false; },
        error: ()      => { this.notesLoading = false; }
      });
  }

  saveNewNote(): void {
    if (!this.conversation || !this.newNoteContent.trim() || this.noteSaving) return;
    this.noteSaving = true;
    this.noteService.createNote(this.conversation.id, this.currentUserId, this.newNoteContent.trim())
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (note) => {
          this.notes = [...this.notes, note];
          this.newNoteContent = '';
          this.noteSaving = false;
        },
        error: () => { this.noteSaving = false; }
      });
  }

  startEditNote(note: ConversationNote): void {
    this.editingNoteId      = note.id;
    this.editingNoteContent = note.content;
  }

  cancelEditNote(): void {
    this.editingNoteId      = null;
    this.editingNoteContent = '';
  }

  saveEditNote(noteId: number): void {
    if (!this.conversation || !this.editingNoteContent.trim()) return;
    this.noteService.updateNote(this.conversation.id, noteId, this.editingNoteContent.trim())
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updated) => {
          this.notes = this.notes.map(n => n.id === noteId ? updated : n);
          this.cancelEditNote();
        }
      });
  }

  deleteNote(noteId: number): void {
    if (!this.conversation) return;
    this.noteService.deleteNote(this.conversation.id, noteId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => { this.notes = this.notes.filter(n => n.id !== noteId); }
      });
  }

  /** Groups notes by noteDate (most recent date first), notes within each group sorted by time ascending. */
  groupedNotes(): { date: string; notes: ConversationNote[] }[] {
    const map = new Map<string, ConversationNote[]>();
    for (const note of this.notes) {
      const key = note.noteDate || note.createdAt?.split('T')[0] || 'unknown';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(note);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([date, notes]) => ({
        date,
        notes: notes.slice().sort((a, b) =>
          (a.createdAt || '').localeCompare(b.createdAt || ''))
      }));
  }

  formatGroupDate(isoDate: string): string {
    if (!isoDate || isoDate === 'unknown') return 'Unknown date';
    const d = new Date(isoDate + 'T00:00:00');
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yest  = new Date(today); yest.setDate(yest.getDate() - 1);
    const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    if (target.getTime() === today.getTime()) return 'Today';
    if (target.getTime() === yest.getTime())  return 'Yesterday';
    return d.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }

  formatNoteTime(isoDate: string): string {
    if (!isoDate) return '';
    return new Date(isoDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  formatNoteDate(isoDate: string): string {
    if (!isoDate) return '';
    const d = new Date(isoDate);
    const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString([], { day: '2-digit', month: 'short' }) + ' · ' + time;
  }

  /** Returns the CSS modifier class for auto-note source type badges. */
  getNoteSourceClass(sourceType: string | null): string {
    return 'note-auto-badge--' + (sourceType || 'other').toLowerCase();
  }

  // ── Toast notifications ───────────────────────────────────
  toast: { message: string; type: 'success' | 'error' | 'info' } | null = null;
  private toastTimeout: any = null;

  showToast(message: string, type: 'success' | 'error' | 'info' = 'info', durationMs = 3500): void {
    if (this.toastTimeout) clearTimeout(this.toastTimeout);
    this.toast = { message, type };
    this.toastTimeout = setTimeout(() => { this.toast = null; }, durationMs);
  }

  // ── Call / Video call state ───────────────────────────────
  callState: 'idle' | 'calling' | 'incoming' | 'active' = 'idle';
  callType: 'audio' | 'video' = 'audio';
  activeCallDuration: string = '00:00';
  private callDurationInterval: any = null;
  private callDurationSeconds: number = 0;
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  remoteStream: MediaStream | null = null;
  private callSignalPollInterval: any = null;
  private currentCallId: string | null = null;
  /** Buffer for ICE candidates that arrive before remoteDescription is set */
  private iceCandidateBuffer: RTCIceCandidateInit[] = [];
  /** Tracks whether the current user initiated the call (for history message logic) */
  private isCallInitiator: boolean = false;

  private destroy$ = new Subject<void>();
  private shouldScrollToBottom = true;

  constructor(
    private route                : ActivatedRoute,
    private router               : Router,
    private conversationService  : ConversationService,
    private state                : MessagingStateService,
    private messageService       : MessageService,
    private cdr                  : ChangeDetectorRef,
    private ngZone               : NgZone,
    private ragSuggestionService : RagSuggestionService,
    private authService          : AuthService,
    private http                 : HttpClient,
    private summaryService       : ConversationSummaryService,
    private noteService          : NoteService,
    public  chatThemeService     : ChatThemeService
  ) {}

  // ── Chat Theme ────────────────────────────────────────────────
  showThemePicker = false;

  get activeTheme(): ChatTheme {
    return this.chatThemeService.getTheme(this.conversation?.id ?? 0);
  }

  getThemeStyles(): Record<string, string> {
    const t = this.activeTheme;
    return {
      '--theme-bubble-bg':     t.bubbleBg,
      '--theme-bubble-text':   t.bubbleText,
      '--theme-bubble-shadow': t.shadow,
      '--theme-primary':       t.primary,
      '--theme-gradient':      t.gradient,
    };
  }

  selectChatTheme(themeId: string): void {
    if (!this.conversation) return;
    this.chatThemeService.setTheme(this.conversation.id, themeId);
    this.showThemePicker = false;
    this.showHeaderMenu  = false;
  }

  openThemePicker(): void {
    this.showThemePicker = true;
    this.showHeaderMenu  = false;
  }

  ngOnInit(): void {
    this.currentUserRole = this.authService.getUserRole() ?? 'CLIENT';
    this.loadConversationFromRoute();
    this.subscribeToMessages();
    this.setupSse();
    this.startCallPolling();
    this.checkModerationStatus();

    // RAG: debounce input → fetch suggestions after 300ms of inactivity
    this.ragSubject$.pipe(
      debounceTime(300),
      takeUntil(this.destroy$)
    ).subscribe(draft => this.loadRagSuggestions(draft));
  }

  /** Restore ban state on page reload. */
  private checkModerationStatus(): void {
    const userId = this.currentUserId;
    if (!userId) return;
    this.http.get<any>(`/api/messages/moderation-status?userId=${userId}`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (status) => {
          if (status?.banned) {
            this.isSendingBanned = true;
            this.bannedUntil = status.bannedUntil ? new Date(status.bannedUntil) : null;
              if (this.bannedUntil) this.scheduleBanExpiry(this.bannedUntil);
              this.startBanMonitor();
          } else {
            // Ban has expired or never existed — clear any stale UI state
            this.isSendingBanned = false;
            this.bannedUntil = null;
            if (this.banExpiryTimer) { clearTimeout(this.banExpiryTimer); this.banExpiryTimer = null; }
            this.stopBanMonitor();
          }
        },
        error: () => { /* non-blocking */ }
      });
  }

  /** Calls the backend refresh endpoint which processes expired bans for the user. */
  private refreshModerationStatus(): void {
    const userId = this.currentUserId;
    if (!userId) return;
    this.http.get<any>(`/api/messages/moderation/refresh?userId=${userId}`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (status) => {
          if (status?.banned) {
            this.isSendingBanned = true;
            this.bannedUntil = status.bannedUntil ? new Date(status.bannedUntil) : null;
              if (this.bannedUntil) this.scheduleBanExpiry(this.bannedUntil);
              this.startBanMonitor();
          } else {
            this.isSendingBanned = false;
            this.bannedUntil = null;
            if (this.banExpiryTimer) { clearTimeout(this.banExpiryTimer); this.banExpiryTimer = null; }
            this.stopBanMonitor();
          }
        },
        error: () => { /* non-blocking */ }
      });
  }

  /**
   * Schedules a timer to automatically lift the send ban when bannedUntil is reached.
   * When the timer fires:
   *  1. Ban state is cleared so the input is re-enabled.
   *  2. Messages are reloaded — the backend scheduler will have deleted the blocked
   *     messages by then, so the red/grey bubbles disappear from chat history too.
   */
  private scheduleBanExpiry(bannedUntil: Date): void {
    if (this.banExpiryTimer) clearTimeout(this.banExpiryTimer);
    const msRemaining = bannedUntil.getTime() - Date.now();
    if (msRemaining <= 0) {
      // Ban already expired — clear immediately and reload
      this.isSendingBanned = false;
      this.bannedUntil = null;
      this.stopBanMonitor();
      this.reloadMessagesAfterBanExpiry();
      return;
    }
    // Run inside NgZone so Angular's change detection picks up the state update
    this.startBanCountdown(bannedUntil);
    this.banExpiryTimer = setTimeout(() => {
      this.ngZone.run(() => {
        this.isSendingBanned = false;
        this.bannedUntil = null;
        this.stopBanCountdown();
        this.stopBanMonitor();
        this.reloadMessagesAfterBanExpiry();
      });
    }, msRemaining);
  }

  /** Start a short polling monitor while a ban is active to auto-detect expiry. */
  private startBanMonitor(): void {
    if (this.banMonitorInterval) return;
    const userId = this.currentUserId;
    if (!userId) return;
    // Poll every 5 seconds; call the refresh endpoint which will delete blocked
    // messages immediately when the ban has expired on the server.
    this.banMonitorInterval = setInterval(() => {
      try {
        this.http.get<any>(`/api/messages/moderation/refresh?userId=${userId}`)
          .pipe(takeUntil(this.destroy$))
          .subscribe({ next: (status) => {
            if (!status?.banned) {
              // Ban cleared on server — clear local monitor and reload messages
              this.stopBanMonitor();
              this.isSendingBanned = false;
              this.bannedUntil = null;
              this.stopBanCountdown();
              this.reloadMessagesAfterBanExpiry();
            }
          }, error: () => {
            // ignore transient errors
          }});
      } catch { /* ignore */ }
    }, 5000);
  }

  private stopBanMonitor(): void {
    if (this.banMonitorInterval) { clearInterval(this.banMonitorInterval); this.banMonitorInterval = null; }
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

  /** Reloads the current conversation's messages after a ban expires to remove blocked bubbles. */
  private reloadMessagesAfterBanExpiry(): void {
    if (!this.conversation) return;
    const userId = this.currentUserId;
    const otherId = this.conversation.otherUserId;

    const calls = [] as any[];
    if (userId) {
      calls.push(this.http.get<any>(`/api/messages/moderation/refresh?userId=${userId}`).pipe(catchError(() => of(null))));
    }
    if (otherId) {
      calls.push(this.http.get<any>(`/api/messages/moderation/refresh?userId=${otherId}`).pipe(catchError(() => of(null))));
    }

    const reload = () => {
      this.messageService.getMessagesByConversation(this.conversation!.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({ next: (resp) => this.messageService.setMessages(resp.content) });
    };

    if (calls.length > 0) {
      forkJoin(calls).pipe(takeUntil(this.destroy$)).subscribe({ next: () => reload(), error: () => reload() });
    } else {
      reload();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    // ✅ Stop message polling but do NOT clearMessages — clearing triggers a flash
    this.messageService.stopPolling();
    // Tear down any active call and fully stop call polling
    this.cleanupCall();
    this.stopCallPolling();
    this.ragSubject$.complete();
    if (this.banExpiryTimer) clearTimeout(this.banExpiryTimer);
    this.stopBanCountdown();
    try { if (this.eventSource) this.eventSource.close(); } catch {}
  }

  // ── Server-Sent Events (SSE) for reminders / updates
  private eventSource: EventSource | null = null;

  private setupSse(): void {
    const uid = this.currentUserId;
    if (!uid) return;
    try {
      const url = `${API_BASE}/api/notifications/subscribe?userId=${uid}`;
      this.eventSource = new EventSource(url);
      this.eventSource.addEventListener('connected', () => { /* noop */ });
      this.eventSource.addEventListener('reminder', (e: any) => {
        try {
          const data = JSON.parse(e.data);
          // If reminder concerns current conversation, bump UI
          if (this.conversation && data.conversationId === this.conversation.id) {
            this.conversation.priorityLevel = 'HIGH';
            this.showToast('Reminder: conversation needs a reply', 'info');
            // Optionally refresh conversation data
            this.conversationService.getConversationById(this.conversation.id).pipe(takeUntil(this.destroy$)).subscribe();
          }
        } catch { }
      });
      this.eventSource.addEventListener('update', (e: any) => {
        try {
          const data = JSON.parse(e.data);
          if (data && data.conversationId && this.conversation && data.conversationId === this.conversation.id) {
            if (data.type === 'archived') {
              this.conversation.isArchived = true;
              this.showToast('This conversation was archived automatically', 'info');
            }
          }
        } catch { }
      });
    } catch (err) {
      // Non-blocking: SSE may be blocked in some environments
      console.debug('SSE not available', err);
    }
  }

  // ── RAG Suggestion methods ──────────────────────────────────────

  /** Called on every textarea input event — feeds the debounce pipeline. */
  onMessageInput(): void {
    this.ragSubject$.next(this.messageText);
  }

  private loadRagSuggestions(draft: string): void {
    if (!this.conversation) return;
    const trimmed = draft.trim();
    // Require at least 1 real letter — clear only if input is empty or pure symbols
    if (trimmed.length === 0 || /^[\d\s\W]+$/.test(trimmed)) {
      this.ragSuggestions = [];
      return;
    }

    // Rotation key = first 30 chars of lowercased draft (groups same trigger together)
    const key = trimmed.toLowerCase().substring(0, 30);
    const offset = this.suggestionOffsets.get(key) ?? 0;

    // Keep existing suggestions visible while the new request loads (avoids blank flash)
    this.isLoadingSuggestions = true;
    this.ragSuggestionService
      .getSuggestions(trimmed, this.currentUserRole, this.conversation.id, this.currentUserId, offset)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (suggestions) => {
          const filtered = suggestions.filter(s => {
            if (!s.text || !s.text.trim()) return false;
            const t = s.text.trim();
            if (t.startsWith('{') || t.startsWith('[')) return false;
            if (t.length > 200) return false;
            if (t.includes('/api/messages/files/')) return false;
            return true;
          });
          // Only replace suggestions when new ones arrive; keep old ones on empty response
          if (filtered.length > 0) {
            this.ragSuggestions = filtered;
            this.suggestionOffsets.set(key, offset + 1);
          }
          this.isLoadingSuggestions = false;
          this.cdr.markForCheck();
        },
        error: () => { this.isLoadingSuggestions = false; }
      });
  }

  /** Replace current draft with a suggested text. */
  applySuggestion(text: string): void {
    this.messageText = text;
    this.ragSuggestions = [];
    this.messageInput?.nativeElement?.focus();
  }

  /** Manually dismiss suggestion chips. */
  dismissSuggestions(): void {
    this.ragSuggestions = [];
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
    // Reactively attach media streams to video/audio elements as soon as they
    // appear in the DOM (call overlays use *ngIf so elements come and go).
    if (this.localStream) {
      // Active call overlay (id='local-video') + calling preview (id='local-video-preview')
      ['local-video', 'local-video-preview'].forEach(elId => {
        const localVid = document.getElementById(elId) as HTMLVideoElement | null;
        if (localVid && !localVid.srcObject) {
          localVid.srcObject = this.localStream!;
          localVid.play().catch(() => {});
        }
      });
    }
    if (this.remoteStream) {
      const remoteVid = document.getElementById('remote-video') as HTMLVideoElement | null;
      if (remoteVid && !remoteVid.srcObject) {
        remoteVid.srcObject = this.remoteStream;
        remoteVid.play().catch(() => {});
      }
      const remoteAudio = document.getElementById('remote-audio') as HTMLAudioElement | null;
      if (remoteAudio && !remoteAudio.srcObject) {
        remoteAudio.srcObject = this.remoteStream;
        remoteAudio.play().catch(() => {});
      }
    }
  }

  private loadConversationFromRoute(): void {
    this.route.params.pipe(
      takeUntil(this.destroy$),
      switchMap(params => {
        this.isLoading = true;
        const id = +params['id'];
        this.state.setSelectedId(id);
        // Ensure moderation status is refreshed (and expired bans processed)
        // immediately when opening a conversation so blocked messages are
        // removed promptly after a suspension expires.
        try { this.refreshModerationStatus(); } catch (e) {}

        // ✅ Stop polling but keep old messages visible until new ones load (no flash)
        this.messageService.stopPolling();

        const cached = this.state.conversations.find(c => c.id === id);
        if (cached) {
          this.conversation = cached;
          this.ensureUnarchiveOnOpen();
          // If we have an otherUserId cached, refresh moderation for that participant
          // so expired bans for the other participant are processed immediately.
          if (cached.otherUserId) {
            return this.http.get<any>(`/api/messages/moderation/refresh?userId=${cached.otherUserId}`)
              .pipe(
                takeUntil(this.destroy$),
                switchMap(() => this.messageService.getMessagesByConversation(id)),
                catchError(() => this.messageService.getMessagesByConversation(id))
              );
          }
          return this.messageService.getMessagesByConversation(id);
        }
        return this.conversationService.getConversationById(id).pipe(
          switchMap(conv => {
            this.conversation = conv;
            this.ensureUnarchiveOnOpen();
            // If the conversation's other participant recently had a ban that expired,
            // processing it now ensures the receiver sees a clean history immediately.
            if (conv.otherUserId) {
              return this.http.get<any>(`/api/messages/moderation/refresh?userId=${conv.otherUserId}`)
                .pipe(
                  takeUntil(this.destroy$),
                  switchMap(() => this.messageService.getMessagesByConversation(conv.id)),
                  catchError(() => this.messageService.getMessagesByConversation(conv.id))
                );
            }
            return this.messageService.getMessagesByConversation(conv.id);
          })
        );
      })
    ).subscribe({
      next: (response) => {
        // ✅ isLoading=false THEN push messages — spinner stays until messages ready
        this.isLoading = false;
        this.messageService.setMessages(response.content);
        this.shouldScrollToBottom = true;
        if (this.conversation) {
          this.messageService.startPolling(this.conversation.id, 5000);
        }
        this.markMessagesAsRead();
      },
      error: (error) => {
        console.error('Erreur chargement:', error);
        this.isLoading = false;
        this.router.navigate(['/communication']);
      }
    });
  }

  private subscribeToMessages(): void {
    this.messageService.messages$.pipe(takeUntil(this.destroy$)).subscribe(messages => {
      // ✅ Never replace existing messages with empty array during loading (prevents flash)
      if (messages.length === 0 && this.isLoading) return;

      const sorted = this.messageService.sortMessages(messages, true);
      const prevIds = this.messages.map(m => m.id).join(',');
      const newIds  = sorted.map(m => m.id).join(',');
      this.messages = sorted;
      if (prevIds !== newIds) {
        this.shouldScrollToBottom = true;
      }
    });
  }

  // ══════════════════════════════════════════════════════════
  //  SEND
  // ══════════════════════════════════════════════════════════
  onEnterKey(event: Event): void {
    const keyEvent = event as KeyboardEvent;
    if (!keyEvent.shiftKey) { event.preventDefault(); this.sendMessage(); }
  }

  sendMessage(): void {
    if ((!this.messageText.trim() && !this.selectedFile) || !this.conversation || this.isSending) return;
    // Guard: the blocked receiver must never be able to send messages.
    if (this.isConversationBlocked() && !this.amITheBlocker()) {
      this.showToast('You cannot send messages — you have been blocked.', 'error');
      return;
    }
    // Guard: user is temporarily banned for content violations.
    if (this.isSendingBanned) {
      this.showToast('Sending suspended — your messaging privileges are temporarily blocked.', 'error');
      return;
    }
    this.isSending = true;
    this.selectedFile ? this.sendFileMessage() : this.sendTextMessage();
  }

  private sendTextMessage(): void {
    if (!this.conversation) return;
    let content = this.messageText.trim();
    if (this.replyingTo) {
      const preview = this.replyingTo.content.substring(0, 50);
      const name    = this.replyingTo.senderId === this.currentUserId ? 'Vous' : this.getParticipantName();
      content = `↩️ @${name}: "${preview}"\n${content}`;
    }
    this.messageService.sendMessage({
      conversationId: this.conversation.id,
      content,
      contentType: MessageContentType.TEXT,
      senderRole: this.currentUserRole,
      senderEmail: this.authService.getUserEmail() ?? undefined
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (msg) => {
        this.messageText = '';
        this.ragSuggestions = [];
        this.replyingTo = null;
        this.isSending = false;
        this.shouldScrollToBottom = true;

        // ── Moderation: flagged message ──────────────────────────────────
        if (msg.isFlagged) {
          const count = msg.violationCount ?? 1;
          const bannedUntilStr = msg.bannedUntil;
          if (bannedUntilStr) {
            // This violation triggered a ban (3rd violation)
            this.isSendingBanned = true;
            this.bannedUntil = new Date(bannedUntilStr);
            this.scheduleBanExpiry(this.bannedUntil);
            this.showToast(
              `🚫 Your message contains inappropriate content. Messaging suspended for 5 minutes.`,
              'error', 7000
            );
          } else {
            this.showToast(
              `⚠️ Message blocked — inappropriate content detected (warning ${count}/3).`,
              'error', 5000
            );
          }
          return; // message already in state as BLOCKED; skip lastMessage update
        }

        // ✅ FIX: mettre à jour lastMessageContent dans le state
        if (this.conversation) {
          this.state.patchConversation(this.conversation.id, {
            lastMessageContent: msg.content,
            lastMessageAt: msg.createdAt
          });
        }
      },
      error: (err) => {
        this.isSending = false;
        if (err.status === 429) {
          this.isSendingBanned = true;
          this.bannedUntil = err.error?.bannedUntil ? new Date(err.error.bannedUntil) : null;
          if (this.bannedUntil) this.scheduleBanExpiry(this.bannedUntil);
          this.showToast(
            '🚫 Your messaging privileges are suspended. Please wait 5 minutes.',
            'error', 7000
          );
        }
      }
    });
  }

  private sendFileMessage(): void {
    if (!this.conversation || !this.selectedFile) return;
    const contentType = this.selectedFile.type.startsWith('audio/')
      ? MessageContentType.RECORD
      : this.selectedFile.type.startsWith('image/')
        ? MessageContentType.IMAGE
        : this.selectedFile.type.startsWith('video/')
          ? MessageContentType.VIDEO
          : MessageContentType.FILE;
    this.messageService.sendMessageWithFile(this.conversation.id, this.selectedFile, contentType)
      .pipe(takeUntil(this.destroy$)).subscribe({
      next: (msg) => {
        this.messageText = '';
        // cleanup any recorded URL
        if (this.recordedUrl) { try { URL.revokeObjectURL(this.recordedUrl); } catch {} this.recordedUrl = null; }
        this.selectedFile = null;
        this.replyingTo = null;
        this.isSending = false;
        this.shouldScrollToBottom = true;
        // ✅ FIX: mettre à jour lastMessageContent dans le state
        if (this.conversation) {
          this.state.patchConversation(this.conversation.id, {
            lastMessageContent: msg.content || '📎 Fichier',
            lastMessageAt: msg.createdAt
          });
        }
      },
      error: () => { this.isSending = false; }
    });
  }

  /** Opens the OS file picker.
   *  Uses setTimeout(0) so the click fires after Angular's current change-detection
   *  cycle, which prevents the *ngIf re-evaluation from unmounting the input. */
  triggerFilePicker(): void {
    setTimeout(() => {
      const el = document.getElementById('mt-file-input') as HTMLInputElement | null;
      el?.click();
    }, 0);
  }

  /** @deprecated use triggerFilePicker() */
  openFilePicker(): void { this.triggerFilePicker(); }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) this.selectedFile = input.files[0];
  }

  removeSelectedFile(): void {
    this.selectedFile = null;
    if (this.recordedUrl) { try { URL.revokeObjectURL(this.recordedUrl); } catch {} this.recordedUrl = null; }
  }

  cancelRecorded(): void {
    // Cancel the recorded draft and clean resources
    this.selectedFile = null;
    if (this.recordedUrl) {
      try { URL.revokeObjectURL(this.recordedUrl); } catch {}
      this.recordedUrl = null;
    }
    this.recordingTimer = '00:00';
    if (this.recordingInterval) { clearInterval(this.recordingInterval); this.recordingInterval = null; }
  }

  // ══════════════════════════════════════════════════════════
  //  REPLY
  // ══════════════════════════════════════════════════════════
  startReply(message: Message): void {
    this.replyingTo = message;
    this.activeMenuMessageId = null;
    setTimeout(() => this.messageInput?.nativeElement?.focus(), 100);
  }

  focusMessageInput(): void {
    try {
      this.messageInput?.nativeElement?.focus();
    } catch {}
  }

  async toggleRecording(): Promise<void> {
    if (!this.conversation) return;
    try {
      if (this.isRecording) {
        // stop recording
        this.mediaRecorder?.stop();
        // stop timer
        if (this.recordingInterval) { clearInterval(this.recordingInterval); this.recordingInterval = null; }
        this.isRecording = false;
        this.recordingStartTs = null;
        return;
      }

      // ask for microphone permission and start
      const stream = await (navigator.mediaDevices as any).getUserMedia({ audio: true });
      this.recordedChunks = [];
      this.mediaRecorder = new (window as any).MediaRecorder(stream);

      this.mediaRecorder.ondataavailable = (e: any) => {
        if (e.data && e.data.size) this.recordedChunks.push(e.data);
      };

      this.mediaRecorder.onstop = async () => {
        try {
          // Strip codec params (e.g. "audio/webm;codecs=opus" → "audio/webm")
          const rawMime = this.recordedChunks[0]?.type || 'audio/webm';
          const mimeType = rawMime.split(';')[0].trim();
          const ext = mimeType.split('/')[1] || 'webm';
          const blob = new Blob(this.recordedChunks, { type: mimeType });
          const filename = `voice-${Date.now()}.${ext}`;
          const file = new File([blob], filename, { type: mimeType });
          // keep as draft: allow playback/cancel before sending
          this.selectedFile = file;
          try { this.recordedUrl && URL.revokeObjectURL(this.recordedUrl); } catch {}
          this.recordedUrl = URL.createObjectURL(blob);
          // do NOT auto-send; user will press send
        } catch (err) {
          console.error('Erreur création audio:', err);
        }
      };

      this.mediaRecorder.start();
      // start timer
      this.recordingStartTs = Date.now();
      this.recordingTimer = '00:00';
      this.recordingInterval = setInterval(() => {
        if (!this.recordingStartTs) return;
        const s = Math.floor((Date.now() - this.recordingStartTs) / 1000);
        const mm = Math.floor(s / 60).toString().padStart(2, '0');
        const ss = (s % 60).toString().padStart(2, '0');
        this.recordingTimer = `${mm}:${ss}`;
      }, 500);
      this.isRecording = true;
    } catch (err) {
      console.error('Microphone not accessible:', err);
      alert('Cannot access microphone. Please check your browser permissions.');
    }
  }

  cancelReply(): void { this.replyingTo = null; }

  getReplyName(): string {
    if (!this.replyingTo) return '';
    return this.replyingTo.senderId === this.currentUserId ? 'Vous' : this.getParticipantName();
  }

  // ══════════════════════════════════════════════════════════
  //  EDIT
  // ══════════════════════════════════════════════════════════
  startEditingMessage(message: Message): void {
    this.editingMessageId   = +message.id;
    const m = message.content.match(/^↩️ @[^\n]+\n(.+)$/s);
    this.editingMessageText = m ? m[1] : message.content;
    this.activeMenuMessageId = null;
  }

  saveEditedMessage(): void {
    if (!this.editingMessageId || !this.editingMessageText.trim()) return;
    this.messageService.updateMessage(+this.editingMessageId, { content: this.editingMessageText.trim() })
      .pipe(takeUntil(this.destroy$)).subscribe({
      next: () => this.cancelEditing(),
      error: err => console.error('Erreur modification:', err)
    });
  }

  cancelEditing(): void { this.editingMessageId = null; this.editingMessageText = ''; }

  // ══════════════════════════════════════════════════════════
  //  PIN MESSAGE
  // ══════════════════════════════════════════════════════════
  togglePinMessage(message: Message): void {
    this.activeMenuMessageId = null;
    this.messageService.togglePinMessage(message.id).pipe(takeUntil(this.destroy$)).subscribe();
  }

  isMessagePinned(message: Message): boolean {
    return this.messageService.isMessagePinned(message.id);
  }

  getPinnedMessages(): Message[] {
    return this.messages.filter(m => this.messageService.isMessagePinned(m.id) && !m.isDeleted);
  }

  scrollToPinnedMessage(message: Message): void {
    const el = document.getElementById(`msg-${message.id}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ring-2', 'ring-amber-400', 'rounded-2xl');
      setTimeout(() => el.classList.remove('ring-2', 'ring-amber-400', 'rounded-2xl'), 2000);
    }
  }

  // ══════════════════════════════════════════════════════════
  //  EMOJI REACTIONS
  // ══════════════════════════════════════════════════════════
  toggleReactionPicker(messageId: number, event: Event): void {
    event.stopPropagation();
    this.reactionPickerMessageId = this.reactionPickerMessageId === messageId ? null : messageId;
    this.activeMenuMessageId = null;
  }

  addReaction(message: Message, emoji: string): void {
    this.reactionPickerMessageId = null;
    this.messageService.addReaction(message.id, emoji).pipe(takeUntil(this.destroy$)).subscribe({
      error: err => console.error('Erreur réaction:', err)
    });
  }

  removeReaction(message: Message): void {
    this.messageService.removeReaction(message.id).pipe(takeUntil(this.destroy$)).subscribe({
      error: err => console.error('Erreur suppression réaction:', err)
    });
  }

  // ══════════════════════════════════════════════════════════
  //  MENUS
  // ══════════════════════════════════════════════════════════
  toggleMessageMenu(messageId: number, event: Event): void {
    event.stopPropagation();

    if (this.activeMenuMessageId === messageId) {
      this.activeMenuMessageId = null;
      return;
    }

    // Compute viewport-relative position from the ⋮ button's bounding rect.
    // position:fixed on the dropdown escapes all scroll/overflow:hidden ancestors.
    const btn  = event.currentTarget as HTMLElement;
    const rect = btn.getBoundingClientRect();
    const vw   = window.innerWidth;
    const vh   = window.innerHeight;
    const dropW = 210;
    const dropH = 240; // max estimated height

    // Default: open below the button, right-aligned with its right edge
    let top  = rect.bottom + 4;
    let left = rect.right - dropW;

    // If it would overflow the bottom, open above instead
    if (top + dropH > vh - 8) {
      top = rect.top - dropH - 4;
    }

    // Hard clamp: always keep inside the viewport
    top  = Math.max(8, Math.min(top,  vh - dropH - 8));
    left = Math.max(8, Math.min(left, vw - dropW - 8));

    this.menuDropdownStyle       = { top: `${top}px`, left: `${left}px` };
    this.activeMenuMessageId     = messageId;
    this.showHeaderMenu          = false;
    this.reactionPickerMessageId = null;
    this.showEmojiPicker         = false;
  }

  toggleHeaderMenu(): void {
    this.showHeaderMenu = !this.showHeaderMenu;
    this.activeMenuMessageId = null;
  }

  closeAllMenus(): void {
    this.activeMenuMessageId    = null;
    this.showHeaderMenu         = false;
    this.reactionPickerMessageId= null;
    this.showEmojiPicker        = false;
  }

  // ══════════════════════════════════════════════════════════
  //  HEADER ACTIONS
  // ══════════════════════════════════════════════════════════
  toggleFavorite(): void {
    if (!this.conversation) return;
    this.conversationService.toggleFavorite(this.conversation.id, this.conversation.isFavorite)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: updated => {
          this.conversation = updated;
          this.showHeaderMenu = false;
        }
      });
  }

  togglePinConversation(): void {
    if (!this.conversation) return;
    this.conversationService.togglePinConversation(this.conversation.id)
      .pipe(takeUntil(this.destroy$)).subscribe();
    this.showHeaderMenu = false;
  }

  // ✅ FIX: archive reste sur /messages, ne redirige plus vers /freelancers
  archiveConversation(): void {
    if (!this.conversation) return;
    const convId = this.conversation.id;
    const isCurrentlyArchived = this.conversation.isArchived;

    this.conversationService.toggleArchive(convId, isCurrentlyArchived)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updated) => {
          console.log('✅ Archive toggled, isArchived:', updated.isArchived);
          // ✅ FIX: toujours naviguer vers /messages (pas /freelancers)
          this.router.navigate(['/communication']);
        },
        error: (err) => {
          console.error('❌ archiveConversation error:', err);
          // ✅ FIX: même en cas d'erreur, rester sur /messages
          this.router.navigate(['/communication']);
        }
      });
    this.showHeaderMenu = false;
  }

  // ══════════════════════════════════════════════════════════
  //  RENAME CONVERSATION
  //  Opens the inline rename modal — same flow as conversation-list
  // ══════════════════════════════════════════════════════════
  openRename(): void {
    if (!this.conversation) return;
    this.renameValue     = this.conversation.title || this.getParticipantName();
    this.renameEmoji     = this.conversation.emojiIcon || '';
    this.showRenameModal = true;
    this.showHeaderMenu  = false;
  }

  cancelRename(): void {
    this.showRenameModal = false;
    this.renameValue     = '';
    this.renameEmoji     = '';
  }

  confirmRename(): void {
    if (!this.conversation || !this.renameValue.trim()) return;
    const id    = this.conversation.id;
    const title = this.renameValue.trim();
    const emoji = this.renameEmoji;
    this.conversationService.updateConversation(id, { title, emojiIcon: emoji })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: updated => {
          // Reflect the new title/emoji immediately in the header
          this.conversation = { ...this.conversation!, title: updated.title, emojiIcon: updated.emojiIcon };
          this.cancelRename();
        },
        error: err => console.error('❌ renameConversation', err)
      });
  }

  // ══════════════════════════════════════════════════════════
  //  BLOCK / UNBLOCK USER
  //
  //  Uses the dedicated POST /api/conversations/{id}/block|unblock
  //  endpoints (already in ConversationController + ConversationService).
  //  After blocking  → navigate back to /communication (conv disappears
  //  from normal list and moves to the Blocked tab — Messenger style).
  //  After unblocking → stay on the thread; conversation is restored.
  // ══════════════════════════════════════════════════════════
  isConversationBlocked(): boolean {
    return this.conversation?.status === 'BLOCKED' ||
      (this.conversation?.status as any) === 'BLOCKED';
  }

  /**
   * Returns true when the CURRENT user is the one who performed the block.
   * Used to differentiate banner A (blocker view) from banner B (blocked receiver view).
   */
  amITheBlocker(): boolean {
    return this.isConversationBlocked() &&
      this.conversation?.blockedById === this.currentUserId;
  }

  // Opens the block/unblock confirmation modal
  blockUser(): void {
    if (!this.conversation) return;
    this.showHeaderMenu = false;
    this.showBlockModal = true;
  }

  cancelBlock(): void {
    this.showBlockModal = false;
  }

  confirmBlock(): void {
    if (!this.conversation) return;
    this.showBlockModal = false;

    if (this.isConversationBlocked()) {
      // UNBLOCK
      this.conversationService.unblockConversation(this.conversation.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: updated => {
            this.conversation = { ...this.conversation!, status: updated.status, blockedById: updated.blockedById };
          },
          error: err => console.error('❌ unblockConversation', err)
        });
    } else {
      // BLOCK → navigate away after (conv moves to Blocked tab)
      this.conversationService.blockConversation(this.conversation.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => this.router.navigate(['/communication']),
          error: err => console.error('❌ blockConversation', err)
        });
    }
  }

  // Opens the delete confirmation modal
  deleteConversation(): void {
    if (!this.conversation) return;
    this.showHeaderMenu  = false;
    this.showDeleteModal = true;
  }

  cancelDelete(): void {
    this.showDeleteModal = false;
  }

  confirmDelete(): void {
    if (!this.conversation) return;
    const id = this.conversation.id;
    this.showDeleteModal = false;

    this.conversationService.deleteConversation(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next : () => this.router.navigate(['/communication']),
        error: (err) => {
          if (err.status !== 404) console.error('❌ deleteConversation', err);
          this.router.navigate(['/communication']);
        }
      });
  }

  // Also replace the message-level delete confirm() with a simple direct call
  deleteMessage(message: Message): void {
    this.activeMenuMessageId = null;
    this.messageService.deleteMessage(message.id).pipe(takeUntil(this.destroy$)).subscribe({
      error: err => console.error('Erreur suppression:', err)
    });
  }

  // ══════════════════════════════════════════════════════════
  //  EMOJI INPUT PICKER
  // ══════════════════════════════════════════════════════════
  toggleEmojiPicker(): void {
    this.showEmojiPicker = !this.showEmojiPicker;
    this.activeMenuMessageId = null;
  }

  insertEmoji(emoji: string): void {
    this.messageText += emoji;
    this.showEmojiPicker = false;
  }

  // ══════════════════════════════════════════════════════════
  //  MARK AS READ
  // ══════════════════════════════════════════════════════════
  private markMessagesAsRead(): void {
    if (!this.conversation) return;
    const convId = this.conversation.id;
    // Optimistically zero the badge immediately — don't wait for next poll
    this.state.patchConversation(convId, { unreadCount: 0 });
    this.messageService.markAllAsRead(convId)
      .pipe(takeUntil(this.destroy$)).subscribe();
  }

  // ══════════════════════════════════════════════════════════
  //  NAVIGATION
  // ══════════════════════════════════════════════════════════
  goBack(): void {
    this.router.navigate(['/communication']);
  }

  // ══════════════════════════════════════════════════════════
  //  DISPLAY HELPERS
  // ══════════════════════════════════════════════════════════
  isMyMessage(message: Message): boolean {
    return message.senderId === this.currentUserId;
  }

  getParticipantName(): string {
    if (!this.conversation) return '';
    if (this.conversation.otherUserFirstName || this.conversation.otherUserLastName)
      return [this.conversation.otherUserFirstName, this.conversation.otherUserLastName].filter(Boolean).join(' ');
    return this.conversation.otherUserUsername || 'Utilisateur';
  }

  /**
   * Best display name for the thread header:
   * 1. Enriched participant name (first + last or username) — most accurate.
   * 2. Conversation title with "Chat with " prefix stripped as fallback.
   */
  getHeaderName(): string {
    const enriched = this.getParticipantName();
    if (enriched && enriched !== 'Utilisateur') return enriched;
    const title = this.conversation?.title ?? '';
    return title.startsWith('Chat with ') ? title.substring(10) : (title || enriched);
  }

  getProfilePicture(): string {
    if (this.conversation?.otherUserProfilePicture) {
      if (this.conversation.otherUserProfilePicture.startsWith('http'))
        return this.conversation.otherUserProfilePicture;
      // Avatars are served by user-service (apiBaseUrl), not communication-service (API_BASE)
      return `${environment.apiBaseUrl}${this.conversation.otherUserProfilePicture.startsWith('/') ? '' : '/'}${this.conversation.otherUserProfilePicture}`;
    }
    const name = this.getParticipantName() || 'User';
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=6366f1&color=fff&size=64`;
  }

  // ✅ FIX: indique si la conversation est favorite (pour afficher l'étoile remplie)
  isFavorite(): boolean {
    return this.conversation?.isFavorite ?? false;
  }

  // ✅ FIX: indique si la conversation est archivée
  isArchived(): boolean {
    return this.conversation?.isArchived ?? false;
  }

  // ✅ FIX: indique si la conversation est épinglée
  isPinned(): boolean {
    return this.conversation ? this.conversationService.isConversationPinned(this.conversation.id) : false;
  }

  formatMessageTime(date: Date): string {
    return new Date(date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }

  // ── Reply helpers ──────────────────────────────────────────────
  /** True when the message is a reply (starts with the ↩️ prefix injected by sendTextMessage). */
  isReplyMessage(message: Message): boolean {
    return !message.isDeleted &&
           !this.isImage(message) && !this.isVideo(message) &&
           !this.isFile(message)  && !this.isAudio(message) && !this.isCall(message) &&
           /^↩️ @[^\n]+\n/.test(message.content ?? '');
  }

  /** Returns the quoted header line, e.g. '@Name: "preview text"'. */
  getReplyQuote(message: Message): string {
    const line = (message.content ?? '').split('\n')[0];
    return line.replace(/^↩️ /, '');   // strip the ↩️ emoji + space
  }

  /** Returns the actual reply body (everything after the first newline). */
  getReplyBody(message: Message): string {
    const parts = (message.content ?? '').split('\n');
    return parts.slice(1).join('\n');
  }

  /**
   * Show the avatar only below the LAST consecutive message from the other user.
   * This prevents repeating the avatar for every bubble in a group.
   */
  shouldShowAvatar(index: number): boolean {
    const message = this.messages[index];
    if (this.isMyMessage(message)) return false;
    const next = this.messages[index + 1];
    return !next || this.isMyMessage(next);
  }

  shouldShowDateSeparator(index: number): boolean {
    if (index === 0) return true;
    const curr = new Date(this.messages[index].createdAt).toDateString();
    const prev = new Date(this.messages[index - 1].createdAt).toDateString();
    return curr !== prev;
  }

  formatDateSeparator(date: Date): string {
    const today     = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    const d         = new Date(date).toDateString();
    if (d === today)     return 'Today';
    if (d === yesterday) return 'Yesterday';
    return new Date(date).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  getDeliveryStatusIcon(message: Message): any {
    switch (message.deliveryStatus) {
      case 'SENT':      return this.CheckIcon;
      case 'DELIVERED': return this.CheckCheckIcon;
      case 'READ':      return this.CheckCheckIcon;
      default:          return null;
    }
  }

  isImage(message: Message): boolean {
    return message.contentType === MessageContentType.IMAGE ||
      (typeof message.content === 'string' && message.content.startsWith('data:image'));
  }

  isVideo(message: Message): boolean {
    return message.contentType === MessageContentType.VIDEO ||
      (typeof message.content === 'string' && message.content.startsWith('data:video'));
  }

  isAudio(message: Message): boolean {
    return message.contentType === MessageContentType.RECORD ||
      (typeof message.content === 'string' && (
        message.content.startsWith('data:audio') ||
        message.content.match(/\.(mp3|ogg|wav|m4a|webm|opus)(\?|$)/i) !== null ||
        (message.content.includes('/api/messages/files/') &&
          message.content.match(/\.(mp3|ogg|wav|m4a|webm|opus)/i) !== null)
      ));
  }

  isFile(message: Message): boolean {
    if (this.isImage(message) || this.isVideo(message) || this.isAudio(message)) return false;
    return message.contentType === MessageContentType.FILE ||
      (typeof message.content === 'string' && message.content.startsWith('data:'));
  }

  getAudioUrl(message: Message): string {
    let content = message.content;
    // Strip codec params from URL path (e.g. ".webm;codecs=opus" → ".webm")
    if (!content.startsWith('data:')) {
      const semiIdx = content.indexOf(';');
      if (semiIdx !== -1) content = content.substring(0, semiIdx);
    }
    if (content.startsWith('/api')) {
      return `${API_BASE}${content}`;
    }
    if (content.startsWith('http') || content.startsWith('data:')) {
      return content;
    }
    return content;
  }

  getFileName(message: Message): string {
    if (message.content?.startsWith('data:')) {
      const m = message.content.match(/data:([^;]+);/);
      return `fichier.${m ? m[1].split('/')[1] : 'bin'}`;
    }
    if (message.content?.includes('/')) {
      const lastPart = message.content.split('/').pop();
      if (lastPart) {
        return decodeURIComponent(lastPart);
      }
    }
    return 'fichier';
  }

  // ══════════════════════════════════════════════════════════
  //  AUDIO PLAYER
  // ══════════════════════════════════════════════════════════
  toggleAudio(messageId: number, event: Event): void {
    event.stopPropagation();
    const audio = this.getAudioEl(messageId);
    if (!audio) return;

    if (this.playingAudioId === messageId) {
      audio.pause();
      this.playingAudioId = null;
    } else {
      // pause any currently playing audio
      if (this.playingAudioId !== null) {
        const prev = this.getAudioEl(this.playingAudioId);
        prev?.pause();
      }
      // If metadata isn't loaded yet, load first then play
      if (!audio.duration || isNaN(audio.duration)) {
        audio.load();
        audio.oncanplay = () => {
          audio.play().catch(() => {});
          audio.oncanplay = null;
        };
      } else {
        audio.play().catch(() => {});
      }
      this.playingAudioId = messageId;
    }
  }

  onAudioTimeUpdate(event: Event, messageId: number): void {
    const audio = event.target as HTMLAudioElement;
    const progress = audio.duration ? (audio.currentTime / audio.duration) * 100 : 0;
    this.audioProgress.set(messageId, progress);
    this.audioCurrentTime.set(messageId, audio.currentTime);
  }

  onAudioLoaded(event: Event, messageId: number): void {
    const audio = event.target as HTMLAudioElement;
    // Register element so toggleAudio can find it even before metadata event
    this.audioElements.set(messageId, audio);
    if (audio.duration && !isNaN(audio.duration)) {
      this.audioDuration.set(messageId, audio.duration);
      this.cdr.markForCheck();
    }
  }

  /** Fired when duration finally becomes known (handles NaN on initial loadedmetadata) */
  onAudioDurationChange(event: Event, messageId: number): void {
    const audio = event.target as HTMLAudioElement;
    if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
      this.audioDuration.set(messageId, audio.duration);
      this.audioElements.set(messageId, audio);
      this.cdr.markForCheck();
    }
  }

  onAudioEnded(messageId: number): void {
    this.playingAudioId = null;
    this.audioProgress.set(messageId, 0);
    const audio = this.getAudioEl(messageId);
    if (audio) audio.currentTime = 0;
  }

  seekAudio(messageId: number, event: MouseEvent): void {
    const audio = this.getAudioEl(messageId);
    if (!audio) return;
    // Load if needed
    if (!audio.duration || isNaN(audio.duration)) { audio.load(); return; }
    const bar = event.currentTarget as HTMLElement;
    const rect = bar.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    audio.currentTime = ratio * audio.duration;
  }

  getAudioProgress(messageId: number): number {
    return this.audioProgress.get(messageId) ?? 0;
  }

  getAudioTime(messageId: number): string {
    const current   = this.audioCurrentTime.get(messageId);
    const duration  = this.audioDuration.get(messageId)
      ?? this.getAudioEl(messageId)?.duration;
    // Show current time while playing, otherwise show total duration
    const t = (this.playingAudioId === messageId && current != null) ? current : (duration ?? 0);
    if (!t || isNaN(t) || !isFinite(t)) return '0:00';
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  getWaveBars(messageId: number): number[] {
    if (this.waveBarCache.has(messageId)) return this.waveBarCache.get(messageId)!;
    const bars: number[] = [];
    let seed = messageId;
    for (let i = 0; i < 28; i++) {
      seed = (seed * 9301 + 49297) % 233280;
      bars.push(4 + Math.round((seed / 233280) * 20));
    }
    this.waveBarCache.set(messageId, bars);
    return bars;
  }

  /**
   * Falls back to the DOM element (by id) if the Map isn't populated yet
   * (i.e. loadedmetadata hasn't fired).
   */
  private getAudioEl(messageId: number): HTMLAudioElement | null {
    return this.audioElements.get(messageId)
      ?? (document.getElementById('audio-' + messageId) as HTMLAudioElement | null);
  }

  private scrollToBottom(): void {
    try {
      if (this.messagesContainer)
        this.messagesContainer.nativeElement.scrollTop =
          this.messagesContainer.nativeElement.scrollHeight;
    } catch {}
  }

  // ══════════════════════════════════════════════════════════
  //  CALL / VIDEO CALL  (WebRTC + REST-polling signaling)
  // ══════════════════════════════════════════════════════════

  /**
   * Retourne l'ID de l'autre participant dans la conversation.
   * Utilise otherUserId si disponible, sinon le calcule depuis creatorId/receiverId.
   */
  private getOtherUserId(): number | null {
    if (!this.conversation) return null;
    if (this.conversation.otherUserId) return this.conversation.otherUserId;
    // Fallback: déduire depuis creatorId/receiverId
    if (this.conversation.creatorId && this.conversation.receiverId) {
      return this.currentUserId === this.conversation.creatorId
        ? this.conversation.receiverId
        : this.conversation.creatorId;
    }
    return null;
  }

  async initiateCall(type: 'audio' | 'video'): Promise<void> {
    if (!this.conversation || this.callState !== 'idle') return;
    this.callType        = type;
    this.callState       = 'calling';
    this.currentCallId   = this.generateCallId();
    this.iceCandidateBuffer = [];
    this.isCallInitiator = true;

    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: type === 'video' ? { width: { ideal: 1280 }, height: { ideal: 720 } } : false
      });

      this.peerConnection = this.createPeerConnection();
      this.localStream.getTracks().forEach(t => this.peerConnection!.addTrack(t, this.localStream!));

      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);

      await this.postCallSignal({
        callId   : this.currentCallId,
        type     : 'OFFER',
        callType : type,
        fromUserId: this.currentUserId,
        toUserId : this.getOtherUserId()!,
        sdp      : JSON.stringify(offer)
      });

      // (Re-)start polling at 2-second cadence during active call
      this.restartCallPolling(2000);
    } catch (err) {
      console.error('initiateCall error:', err);
      this.cleanupCall();
    }
  }

  async acceptCall(): Promise<void> {
    if (!this.incomingSignal || this.callState !== 'incoming') return;
    const signal       = this.incomingSignal;
    this.incomingSignal = null;
    this.callState     = 'active';
    this.callType      = signal.callType as 'audio' | 'video';
    this.currentCallId = signal.callId;

    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: signal.callType === 'video'
          ? { width: { ideal: 1280 }, height: { ideal: 720 } } : false
      });

      this.peerConnection = this.createPeerConnection();
      this.localStream.getTracks().forEach(t => this.peerConnection!.addTrack(t, this.localStream!));

      // 1. Set remote description (the caller's offer)
      const offer = JSON.parse(signal.sdp);
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));

      // 2. Apply any ICE candidates that arrived before we accepted
      await this.drainIceCandidateBuffer();

      // 3. Create & send answer
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);

      await this.postCallSignal({
        callId   : signal.callId,
        type     : 'ANSWER',
        callType : signal.callType,
        fromUserId: this.currentUserId,
        toUserId : signal.fromUserId,
        sdp      : JSON.stringify(answer)
      });

      this.startCallDurationTimer();
      this.restartCallPolling(2000);
    } catch (err) {
      console.error('acceptCall error:', err);
      this.cleanupCall();
    }
  }

  async rejectCall(): Promise<void> {
    if (!this.incomingSignal) return;
    const signal = this.incomingSignal;
    this.incomingSignal = null;
    this.iceCandidateBuffer = [];

    await this.postCallSignal({
      callId   : signal.callId,
      type     : 'REJECT',
      callType : signal.callType,
      fromUserId: this.currentUserId,
      toUserId : signal.fromUserId,
      sdp      : ''
    }).catch(() => {});

    this.cleanupCall();
  }

  async hangupCall(): Promise<void> {
    const prevState    = this.callState;
    const prevCallType = this.callType;
    const prevDuration = this.callDurationSeconds;

    if (this.currentCallId && this.conversation) {
      await this.postCallSignal({
        callId    : this.currentCallId,
        type      : 'HANGUP',
        callType  : this.callType,
        fromUserId: this.currentUserId,
        toUserId  : this.getOtherUserId()!,
        sdp       : ''
      }).catch(() => {});
    }
    this.cleanupCall();

    // Send a call-history message so both sides see the outcome in chat
    if (prevState === 'active') {
      this.sendCallHistoryMessage(prevCallType, 'completed', prevDuration);
    } else if (prevState === 'calling') {
      // Caller cancelled before callee answered.
      // On envoie un seul message avec status='missed' :
      // - Côté appelant (isMyMessage=true)  → affichera "Annulé"
      // - Côté receveur (isMyMessage=false) → affichera "Manqué"
      // Ainsi le receveur voit l'appel manqué même s'il n'était pas connecté au polling.
      this.sendCallHistoryMessage(prevCallType, 'missed', 0);
    }
  }

  // ── Polling ───────────────────────────────────────────────

  /** Start (or restart) polling at the given interval, clearing any existing one. */
  private restartCallPolling(intervalMs: number): void {
    this.stopCallPolling();
    this.callSignalPollInterval = setInterval(() => this.pollCallSignals(), intervalMs);
  }

  /** Idle background polling to detect incoming calls (3-second cadence). */
  startCallPolling(): void {
    if (this.callSignalPollInterval) return;
    this.callSignalPollInterval = setInterval(() => this.pollCallSignals(), 3000);
  }

  stopCallPolling(): void {
    if (this.callSignalPollInterval) {
      clearInterval(this.callSignalPollInterval);
      this.callSignalPollInterval = null;
    }
  }

  private async pollCallSignals(): Promise<void> {
    if (!this.conversation) return;
    try {
      const url = `${API_BASE}/api/calls/pending`
        + `?userId=${this.currentUserId}`
        + `&callId=${encodeURIComponent(this.currentCallId ?? '')}`;
      const resp = await fetch(url);
      if (!resp.ok) {
        console.warn(`⚠️ Erreur polling signaux d'appel (${resp.status})`);
        return;
      }
      const signals: any[] = await resp.json();

      for (const signal of signals) {
        // Acknowledge / remove from server *before* processing so we don't re-process
        fetch(`${API_BASE}/api/calls/signal/${signal.id}`, { method: 'DELETE' })
          .catch((err) => {
            console.warn(`⚠️ Erreur suppression signal d'appel ${signal.id}:`, err);
          });
        await this.handleSignal(signal);
      }
    } catch (err) {
      console.debug('ℹ️ Backend non disponible pour polling signaux (tentative suivante dans 3s)');
    }
  }

  private async handleSignal(signal: any): Promise<void> {
    switch (signal.type) {

      // ── Incoming call ────────────────────────────────────
      case 'OFFER':
        if (this.callState === 'idle') {
          this.incomingSignal = signal;
          this.callState      = 'incoming';
          this.callType       = signal.callType as 'audio' | 'video';
          // Switch to faster polling while call is ringing
          this.restartCallPolling(2000);
        }
        break;

      // ── Callee answered ──────────────────────────────────
      case 'ANSWER':
        if (this.peerConnection && this.callState === 'calling') {
          const answer = JSON.parse(signal.sdp);
          await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
          // Drain any ICE candidates that were buffered while waiting for the answer
          await this.drainIceCandidateBuffer();
          this.callState = 'active';
          this.startCallDurationTimer();
        }
        break;

      // ── ICE candidate ────────────────────────────────────
      case 'ICE':
        if (!signal.sdp) break;
        if (this.peerConnection && this.peerConnection.remoteDescription) {
          // Remote description already set → apply immediately
          try {
            await this.peerConnection.addIceCandidate(
              new RTCIceCandidate(JSON.parse(signal.sdp))
            );
          } catch { /* stale candidate, ignore */ }
        } else {
          // Remote description not set yet → buffer for later application
          try { this.iceCandidateBuffer.push(JSON.parse(signal.sdp)); } catch {}
        }
        break;

      // ── Callee rejected ──────────────────────────────────
      case 'REJECT': {
        const rejectedCallType = this.callType;
        this.cleanupCall();
        // Caller sees "declined" in chat
        this.sendCallHistoryMessage(rejectedCallType, 'declined', 0);
        break;
      }

      // ── Call ended by other side ──────────────────────────
      case 'HANGUP': {
        const prevHangupState    = this.callState;
        const prevHangupCallType = this.callType;
        this.cleanupCall();
        if (prevHangupState === 'incoming') {
          // Caller cancelled before we answered → missed call for us
          this.sendCallHistoryMessage(prevHangupCallType, 'missed', 0);
        }
        // If 'active', the person who hung up already sent the history message
        break;
      }
    }
  }

  /** Apply all buffered ICE candidates after setRemoteDescription has been called. */
  private async drainIceCandidateBuffer(): Promise<void> {
    if (!this.peerConnection) return;
    while (this.iceCandidateBuffer.length > 0) {
      const candidate = this.iceCandidateBuffer.shift()!;
      try { await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate)); } catch {}
    }
  }

  // ── WebRTC peer connection ────────────────────────────────

  private createPeerConnection(): RTCPeerConnection {
    // Capture les IDs au moment de la création — évite les ICE avec des valeurs périmées
    const capturedCallId   = this.currentCallId;
    const capturedToUser   = this.getOtherUserId();
    const capturedFromUser = this.currentUserId;

    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302'  },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' }
      ]
    });

    pc.ontrack = (event) => {
      this.remoteStream = event.streams[0] ?? new MediaStream(event.track ? [event.track] : []);
    };

    pc.onicecandidate = (event) => {
      // Utiliser les valeurs capturées (immutables) — pas this.currentCallId qui peut changer
      if (!event.candidate || !capturedCallId || !capturedToUser || !capturedFromUser) return;
      if (this.callState === 'idle') return; // Appel déjà raccroché
      this.postCallSignal({
        callId   : capturedCallId,
        type     : 'ICE',
        callType : this.callType,
        fromUserId: capturedFromUser,
        toUserId : capturedToUser,
        sdp      : JSON.stringify(event.candidate)
      }).catch(() => {});
    };

    // Only treat 'failed' as fatal; 'disconnected' is a transient glitch
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed') {
        console.warn('WebRTC connection failed — ending call');
        this.cleanupCall();
      }
    };

    return pc;
  }

  // ── Utilities ─────────────────────────────────────────────

  private async postCallSignal(body: any): Promise<void> {
    try {
      const resp = await fetch(`${API_BASE}/api/calls/signal`, {
        method : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify(body)
      });

      if (!resp.ok) {
        const errorData = await resp.text();
        console.warn(`⚠️ Erreur lors de l'envoi du signal d'appel (${resp.status}):`, errorData);
        console.warn('   Signal type:', body.type);
        console.warn('   Call ID:', body.callId);
        // L'appel continue malgré l'erreur - le signal est perdu mais on ne veut pas crasher l'appel en cours
      } else {
        console.debug(`📞 Signal d'appel envoyé avec succès (${body.type})`);
      }
    } catch (err: any) {
      console.error('❌ Exception lors de l\'envoi du signal d\'appel:', err);
      console.error('   Signal type:', body.type);
      console.error('   Error message:', err?.message);
      // On continue sans interrompre l'appel - le fetch a peut-être échoué temporairement
    }
  }

  cleanupCall(): void {
    this.callState       = 'idle';
    this.remoteStream    = null;
    this.incomingSignal  = null;
    this.iceCandidateBuffer  = [];
    this.isCallInitiator = false;

    if (this.callDurationInterval) {
      clearInterval(this.callDurationInterval);
      this.callDurationInterval = null;
    }
    this.callDurationSeconds = 0;
    this.activeCallDuration  = '00:00';

    // Revert to slow background polling for new incoming calls
    this.restartCallPolling(3000);

    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
    if (this.localStream) {
      this.localStream.getTracks().forEach(t => t.stop());
      this.localStream = null;
    }
    this.currentCallId = null;
  }

  private startCallDurationTimer(): void {
    this.callDurationSeconds = 0;
    if (this.callDurationInterval) clearInterval(this.callDurationInterval);
    this.callDurationInterval = setInterval(() => {
      this.callDurationSeconds++;
      const m = Math.floor(this.callDurationSeconds / 60).toString().padStart(2, '0');
      const s = (this.callDurationSeconds % 60).toString().padStart(2, '0');
      this.activeCallDuration = `${m}:${s}`;
    }, 1000);
  }

  private generateCallId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }

  // Stores incoming OFFER signal until user accepts/rejects
  incomingSignal: any = null;

  // ══════════════════════════════════════════════════════════
  //  CALL HISTORY HELPERS
  // ══════════════════════════════════════════════════════════

  /** Sends a CALL-type message so both sides see the call outcome in the chat. */
  private sendCallHistoryMessage(
    callType: 'audio' | 'video',
    status: 'completed' | 'missed' | 'cancelled' | 'declined',
    duration: number
  ): void {
    if (!this.conversation) return;
    const content = JSON.stringify({ callType, status, duration });
    this.messageService.sendMessage({
      conversationId: this.conversation.id,
      content,
      contentType: MessageContentType.CALL
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        console.log(`✅ Historique d'appel enregistré: ${status}`);
        const label = status === 'completed' ? 'Call ended ✅'
          : status === 'missed'    ? 'Missed call'
            : status === 'declined'  ? 'Call refused'
              : 'Call canceled';
        this.showToast(label, 'success');
      },
      error: (err) => {
        console.error('❌ Call history send error:', err);
        this.showToast('Call ended (history not saved)', 'error');
      }
    });
  }

  isCall(message: Message): boolean {
    return message.contentType === MessageContentType.CALL;
  }

  getCallData(message: Message): { callType: string; status: string; duration: number } {
    try {
      return JSON.parse(message.content);
    } catch {
      return { callType: 'audio', status: 'missed', duration: 0 };
    }
  }

  /**
   * Returns the per-attempt explanatory paragraph shown inside a flagged message bubble.
   * Uses violationCount (1/2/3) stored on the message; falls back to a generic text
   * for messages sent before this field was introduced.
   */
  /**
   * Returns the grey banner text shown to the RECEIVER for each blocked message.
   * The content itself is never exposed — only the reason number.
   */
  getBlockedBannerText(message: Message): string {
    switch (message.violationCount) {
      case 1:
        return 'This message was blocked due to inappropriate content and cannot be viewed.';
      case 2:
        return 'This message was blocked due to repeated inappropriate content and cannot be viewed.';
      case 3:
        return 'This message was blocked. The sender has reached the violation limit and is now suspended.';
      default:
        return 'This message was blocked due to inappropriate content and cannot be viewed.';
    }
  }

  getFlaggedText(message: Message): string {
    switch (message.violationCount) {
      case 1:
        return 'Your message was blocked — it contains inappropriate content. ' +
               'This is your first warning (1/3). ' +
               'Please ensure all your messages remain professional and respectful.';
      case 2:
        return 'Your message was blocked again due to inappropriate content. ' +
               'This is your second warning (2/3). ' +
               'One more violation will result in a 5-minute messaging suspension.';
      case 3:
        return 'Your message was blocked. You have reached the maximum number of violations (3/3). ' +
               'Your messaging privileges have been suspended for 5 minutes. ' +
               'After the suspension, your account will be restored automatically.';
      default:
        return 'Your message was blocked — it contains inappropriate content and was not delivered to the recipient.';
    }
  }

  formatCallDuration(seconds: number): string {
    if (!seconds || seconds <= 0) return '';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    if (m === 0) return `${s}s`;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }
}
