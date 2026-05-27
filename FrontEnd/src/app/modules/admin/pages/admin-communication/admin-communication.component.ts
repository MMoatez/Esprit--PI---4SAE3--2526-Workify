import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { environment } from '../../../../../environments/environment';

export interface CommStats {
  totalConversations: number; activeConversations: number;
  blockedConversations: number; archivedConversations: number;
  totalMessages: number; textMessages: number; voiceMessages: number;
  fileMessages: number; imageMessages: number; callMessages: number;
  flaggedMessages: number; deletedMessages: number; readMessages: number;
  readRate: number; avgMsgPerConv: number;
  currentlyBanned: number; totalViolations: number;
}

export interface HealthScore {
  score: number; status: string;
  flaggedRatio: number; readRate: number;
  blockedConv: number; bannedUsers: number;
}

export interface HourSlot   { hour: number; count: number; intensity: number; }
export interface DaySlot    { day: string;  count: number; intensity: number; }
export interface TopUser    { userId: number; messageCount: number; }
export interface Violation  { id: number; senderId: number; convId: number; contentType: string; preview: string; createdAt: string; }
export interface BannedUser { userId: number; bannedUntil: string; violations: number; }

@Component({
  standalone: false,
  selector: 'app-admin-communication',
  templateUrl: './admin-communication.component.html'
})
export class AdminCommunicationComponent implements OnInit {
  stats: CommStats | null = null;
  health: HealthScore | null = null;
  hourly: HourSlot[] = [];
  velocity: DaySlot[] = [];
  topUsers: TopUser[] = [];
  violations: Violation[] = [];
  bannedUsers: BannedUser[] = [];
  userNames: Record<number, string> = {};

  loading = true;
  error: string | null = null;
  toastMsg: string | null = null;
  toastType: 'success' | 'error' = 'success';

  private base    = environment.communicationApiBaseUrl;
  private userApi = environment.apiBaseUrl;

  constructor(private http: HttpClient) {}

  ngOnInit(): void { this.loadAll(); }

  loadAll(): void {
    this.loading = true;
    this.error = null;
    forkJoin({
      stats:      this.http.get<CommStats>(`${this.base}/api/admin/communication/stats`),
      health:     this.http.get<HealthScore>(`${this.base}/api/admin/communication/health-score`),
      hourly:     this.http.get<HourSlot[]>(`${this.base}/api/admin/communication/hourly-activity`),
      velocity:   this.http.get<DaySlot[]>(`${this.base}/api/admin/communication/velocity`),
      topUsers:   this.http.get<TopUser[]>(`${this.base}/api/admin/communication/top-users`),
      violations: this.http.get<Violation[]>(`${this.base}/api/admin/communication/recent-violations`),
      banned:     this.http.get<BannedUser[]>(`${this.base}/api/admin/communication/banned-users`)
    }).subscribe({
      next: (d) => {
        this.stats       = d.stats;
        this.health      = d.health;
        this.hourly      = d.hourly;
        this.velocity    = d.velocity;
        this.topUsers    = d.topUsers;
        this.violations  = d.violations;
        this.bannedUsers = d.banned;
        this.loading     = false;
        const allIds = [
          ...d.topUsers.map(u => u.userId),
          ...d.violations.map((v: any) => v.senderId)
        ];
        this.loadUserNames([...new Set(allIds)]);
      },
      error: () => {
        this.error   = 'Communication service unreachable. Make sure it is running on port 8084.';
        this.loading = false;
      }
    });
  }

  loadUserNames(ids: number[]): void {
    const requests = ids.reduce((acc, id) => {
      acc[id] = this.http.get<any>(`${this.userApi}/api/public/users/${id}`)
        .pipe(catchError(() => of(null)));
      return acc;
    }, {} as Record<number, any>);

    if (Object.keys(requests).length === 0) return;

    forkJoin(requests).subscribe(results => {
      const updated = { ...this.userNames };
      Object.entries(results).forEach(([id, profile]: [string, any]) => {
        updated[+id] = profile
          ? ([profile.firstName, profile.lastName].filter(Boolean).join(' ') || 'Deleted User')
          : 'Deleted User';
      });
      this.userNames = updated;
    });
  }

  getUserName(userId: number): string {
    return this.userNames[userId] ?? 'Deleted User';
  }

  unbanUser(userId: number): void {
    this.http.delete<any>(`${this.base}/api/admin/communication/banned-users/${userId}`).subscribe({
      next: (r) => {
        this.bannedUsers = this.bannedUsers.filter(u => u.userId !== userId);
        if (this.stats)  this.stats.currentlyBanned  = Math.max(0, this.stats.currentlyBanned - 1);
        if (this.health) this.health.bannedUsers      = Math.max(0, this.health.bannedUsers - 1);
        this.toast(r.message, 'success');
      },
      error: () => this.toast('Failed to unban user.', 'error')
    });
  }

  unbanAll(): void {
    this.http.delete<any>(`${this.base}/api/admin/communication/banned-users`).subscribe({
      next: (r) => {
        this.bannedUsers = [];
        if (this.stats)  this.stats.currentlyBanned = 0;
        if (this.health) this.health.bannedUsers     = 0;
        this.toast(r.message, 'success');
      },
      error: () => this.toast('Failed to unban all.', 'error')
    });
  }

  private toast(msg: string, type: 'success' | 'error'): void {
    this.toastMsg  = msg;
    this.toastType = type;
    setTimeout(() => this.toastMsg = null, 3000);
  }

  healthColor(status: string): string {
    return status === 'EXCELLENT' ? 'text-green-500'
         : status === 'GOOD'      ? 'text-blue-500'
         : status === 'WARNING'   ? 'text-orange-500'
         :                          'text-red-600';
  }

  healthBg(status: string): string {
    return status === 'EXCELLENT' ? 'from-green-400 to-emerald-600'
         : status === 'GOOD'      ? 'from-blue-400 to-blue-600'
         : status === 'WARNING'   ? 'from-orange-400 to-orange-600'
         :                          'from-red-500 to-red-700';
  }

  hourLabel(h: number): string {
    return h === 0 ? '12a' : h < 12 ? `${h}a` : h === 12 ? '12p' : `${h-12}p`;
  }

  heatColor(intensity: number): string {
    if (intensity === 0)  return 'bg-slate-100';
    if (intensity < 20)   return 'bg-primary-100';
    if (intensity < 40)   return 'bg-primary-200';
    if (intensity < 60)   return 'bg-primary-400';
    if (intensity < 80)   return 'bg-primary-500';
    return 'bg-primary-700';
  }

  msgTypePercent(count: number): number {
    if (!this.stats?.totalMessages) return 0;
    return Math.round((count / this.stats.totalMessages) * 100);
  }

  maxVelocity(): number {
    return Math.max(1, ...this.velocity.map(d => d.count));
  }

  topUserBarWidth(count: number): number {
    const max = Math.max(1, ...this.topUsers.map(u => u.messageCount));
    return Math.round((count / max) * 100);
  }

  formatDate(iso: string): string {
    if (!iso) return '';
    return new Date(iso).toLocaleString('fr-TN', { dateStyle: 'short', timeStyle: 'short' });
  }
}
