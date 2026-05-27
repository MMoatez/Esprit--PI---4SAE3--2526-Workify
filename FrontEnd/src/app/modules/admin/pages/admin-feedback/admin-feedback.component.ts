import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { FeedbackDto } from '../../../../core/models/feedback.model';

export interface FeedbackStats {
  totalFeedbacks: number;
  avgGlobalRating: number;
  avgCommunicationRating: number;
  avgQualityRating: number;
  avgDeadlineRating: number;
  avgProfessionalismRating: number;
  recommendRate: number;
  responseRate: number;
  fraudFlaggedCount: number;
  aiAnalyzedCount: number;
  pendingAICount: number;
  sentimentDistribution: Record<string, number>;
  ratingDistribution: Record<string, number>;
  topFreelancers: { freelancerId: number; avgRating: number; count: number }[];
}

@Component({
  standalone: false,
  selector: 'app-admin-feedback',
  templateUrl: './admin-feedback.component.html',
  styleUrls: ['./admin-feedback.component.css']
})
export class AdminFeedbackComponent implements OnInit {
  stats: FeedbackStats | null = null;
  flagged: FeedbackDto[] = [];
  loading = true;
  error: string | null = null;
  minScore = 0.7;
  analyzing = false;
  analyzeMsg: string | null = null;
  activeTab: 'overview' | 'flagged' | 'analytics' = 'overview';

  // ── Freelancer Analytics (admin view) ─────────────────────────────────────
  analyticsId: number | null = null;
  analyticsData: any | null = null;
  analyticsLoading = false;
  analyticsError: string | null = null;
  analyticsInputId = '';

  readonly CHART_W = 560;
  readonly CHART_H = 130;
  readonly PAD_X   = 36;
  readonly PAD_Y   = 12;

  sentimentOrder = ['POSITIVE', 'NEUTRAL', 'NEGATIVE', 'APOLOGETIC', 'CONSTRUCTIVE'];
  ratingStars = [5, 4, 3, 2, 1];

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadAll();
  }

  loadAll(): void {
    this.loading = true;
    this.error = null;
    forkJoin({
      stats:   this.http.get<FeedbackStats>('/api/feedback/admin/stats'),
      flagged: this.http.get<FeedbackDto[]>(`/api/feedback/admin/flagged?minScore=${this.minScore}`)
    }).subscribe({
      next: (d) => {
        this.stats   = d.stats;
        this.flagged = d.flagged;
        this.loading = false;
      },
      error: () => {
        this.error   = 'Unable to load feedback data. Make sure the feedback service is running.';
        this.loading = false;
      }
    });
  }

  loadFlagged(): void {
    this.http.get<FeedbackDto[]>(`/api/feedback/admin/flagged?minScore=${this.minScore}`).subscribe({
      next: (data) => { this.flagged = data; },
      error: () => {}
    });
  }

  analyzeAll(): void {
    this.analyzing = true;
    this.analyzeMsg = null;
    this.http.post('/api/feedback/admin/analyze-all', {}).subscribe({
      next: (msg: any) => {
        this.analyzeMsg = typeof msg === 'string' ? msg : 'AI batch analysis started.';
        this.analyzing = false;
        setTimeout(() => this.loadAll(), 3000);
      },
      error: () => {
        this.analyzeMsg = 'Failed to trigger AI analysis.';
        this.analyzing = false;
      }
    });
  }

  deleteFeedback(fb: FeedbackDto): void {
    this.openModal(
      '🗑️', 'Delete feedback',
      `Delete feedback #${fb.id} from "${fb.projectTitle || 'Project #' + fb.offerId}"? This action cannot be undone.`,
      'Delete', 'modal-btn-danger',
      () => this.http.delete<any>(`/api/feedback/admin/${fb.id}`).subscribe({
        next: (r) => {
          this.flagged = this.flagged.filter(f => f.id !== fb.id);
          if (this.stats) this.stats.fraudFlaggedCount = Math.max(0, this.stats.fraudFlaggedCount - 1);
          this.toast(r.message, 'success');
        },
        error: () => this.toast('Error deleting feedback.', 'error')
      })
    );
  }

  clearFraud(fb: FeedbackDto): void {
    this.openModal(
      '🛡️', 'Clear fraud flag',
      `Mark feedback #${fb.id} as legitimate and remove the fraud flag? It will become visible on the freelancer's public profile.`,
      'Clear flag', 'modal-btn-success',
      () => this.http.put<any>(`/api/feedback/admin/${fb.id}/clear-fraud`, {}).subscribe({
        next: (r) => {
          this.flagged = this.flagged.filter(f => f.id !== fb.id);
          if (this.stats) this.stats.fraudFlaggedCount = Math.max(0, this.stats.fraudFlaggedCount - 1);
          this.toast(r.message, 'success');
        },
        error: () => this.toast('Error clearing fraud flag.', 'error')
      })
    );
  }

  banClient(fb: FeedbackDto): void {
    this.openModal(
      '🚫', 'Ban client',
      `Ban ${fb.clientEmail} and permanently remove ALL their feedbacks from the platform?`,
      'Ban client', 'modal-btn-danger',
      () => this.http.delete<any>(`/api/feedback/admin/client/${encodeURIComponent(fb.clientEmail)}`).subscribe({
        next: (r) => {
          this.flagged = this.flagged.filter(f => f.clientEmail !== fb.clientEmail);
          this.toast(r.message, 'success');
          setTimeout(() => this.loadAll(), 1000);
        },
        error: () => this.toast('Error banning client.', 'error')
      })
    );
  }

  validateFeedback(fb: FeedbackDto): void {
    this.openModal(
      '✅', 'Validate feedback',
      `Approve feedback #${fb.id} and make it publicly visible on the freelancer's profile?`,
      'Validate', 'modal-btn-primary',
      () => this.http.put<any>(`/api/feedback/admin/${fb.id}/validate`, {}).subscribe({
        next: (r) => {
          this.flagged = this.flagged.filter(f => f.id !== fb.id);
          if (this.stats) this.stats.fraudFlaggedCount = Math.max(0, this.stats.fraudFlaggedCount - 1);
          this.toast(r.message || 'Feedback validated and published.', 'success');
        },
        error: () => this.toast('Error validating feedback.', 'error')
      })
    );
  }

  // ── Freelancer Analytics methods ──────────────────────────────────────────

  loadFreelancerAnalytics(id: number): void {
    this.analyticsId      = id;
    this.analyticsData    = null;
    this.analyticsError   = null;
    this.analyticsLoading = true;
    this.http.get<any>(`/api/feedback/analytics/freelancer/${id}`).subscribe({
      next:  (d) => { this.analyticsData = d; this.analyticsLoading = false; },
      error: ()  => { this.analyticsError = 'Unable to load analytics for freelancer #' + id; this.analyticsLoading = false; }
    });
  }

  searchAnalytics(): void {
    const id = parseInt(this.analyticsInputId, 10);
    if (!isNaN(id) && id > 0) this.loadFreelancerAnalytics(id);
  }

  // SVG chart helpers
  svgPoints(pts: any[]): string {
    if (!pts || pts.length < 2) return '';
    const n = pts.length;
    const w = this.CHART_W - this.PAD_X * 2;
    const h = this.CHART_H - this.PAD_Y * 2;
    return pts.map((p, i) => {
      const x = this.PAD_X + (i / (n - 1)) * w;
      const y = this.PAD_Y + ((5 - p.avgRating) / 4) * h;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
  }

  svgFill(pts: any[]): string {
    if (!pts || pts.length < 2) return '';
    const first = pts[0], last = pts[pts.length - 1];
    const n = pts.length;
    const w = this.CHART_W - this.PAD_X * 2;
    const h = this.CHART_H - this.PAD_Y * 2;
    const bottom = this.PAD_Y + h;
    const x0 = this.PAD_X;
    const xN = this.PAD_X + w;
    return `${x0},${bottom} ` + this.svgPoints(pts) + ` ${xN},${bottom}`;
  }

  svgDots(pts: any[]): { x: number; y: number; label: string; month: string }[] {
    if (!pts || !pts.length) return [];
    const n = pts.length;
    const w = this.CHART_W - this.PAD_X * 2;
    const h = this.CHART_H - this.PAD_Y * 2;
    return pts.map((p, i) => ({
      x: this.PAD_X + (n > 1 ? (i / (n - 1)) * w : w / 2),
      y: this.PAD_Y + ((5 - p.avgRating) / 4) * h,
      label: String(p.avgRating),
      month: p.month
    }));
  }

  svgMarketLine(marketAvg: number): string {
    const h = this.CHART_H - this.PAD_Y * 2;
    const y = (this.PAD_Y + ((5 - marketAvg) / 4) * h).toFixed(1);
    return `${this.PAD_X},${y} ${this.CHART_W - this.PAD_X},${y}`;
  }

  xLabels(pts: any[]): { x: number; label: string }[] {
    if (!pts || !pts.length) return [];
    const n = pts.length;
    const w = this.CHART_W - this.PAD_X * 2;
    const step = n > 6 ? Math.ceil(n / 6) : 1;
    return pts
      .map((p, i) => ({ p, i }))
      .filter(({ i }) => i % step === 0 || i === n - 1)
      .map(({ p, i }) => ({
        x: this.PAD_X + (n > 1 ? (i / (n - 1)) * w : w / 2),
        label: p.month
      }));
  }

  aTrend(): 'up' | 'down' | 'stable' {
    const pts = this.analyticsData?.monthlyEvolution ?? [];
    if (pts.length < 2) return 'stable';
    const last = pts[pts.length - 1].avgRating;
    const prev = pts[pts.length - 2].avgRating;
    return last > prev ? 'up' : last < prev ? 'down' : 'stable';
  }

  aTrendIcon(): string { return this.aTrend() === 'up' ? '📈' : this.aTrend() === 'down' ? '📉' : '➡️'; }
  aTrendColor(): string { return this.aTrend() === 'up' ? 'text-green-600' : this.aTrend() === 'down' ? 'text-red-500' : 'text-slate-500'; }

  aRatingCount(star: number): number { return this.analyticsData?.ratingDistribution?.[String(star)] ?? 0; }
  aMaxRating():  number { return Math.max(1, ...Object.values(this.analyticsData?.ratingDistribution ?? { x: 1 }).map(Number)); }
  aBarWidth(star: number): number { return Math.round((this.aRatingCount(star) / this.aMaxRating()) * 100); }
  aBarColor(star: number): string { return star >= 4 ? '#22c55e' : star === 3 ? '#facc15' : '#f87171'; }
  aDimVal(key: string): number { return this.analyticsData?.[key] ?? 0; }

  readonly aDims = [
    { label: 'Communication',   key: 'avgCommunicationRating',   icon: '💬' },
    { label: 'Quality',         key: 'avgQualityRating',          icon: '🎯' },
    { label: 'Deadline',        key: 'avgDeadlineRating',         icon: '⏱' },
    { label: 'Professionalism', key: 'avgProfessionalismRating',  icon: '🏆' },
  ];

  // ── Custom confirm modal ─────────────────────────────────────────────────
  modal: {
    visible: boolean;
    title: string;
    message: string;
    confirmLabel: string;
    confirmClass: string;
    icon: string;
    action: (() => void) | null;
  } = { visible: false, title: '', message: '', confirmLabel: '', confirmClass: '', icon: '', action: null };

  private openModal(
    icon: string,
    title: string,
    message: string,
    confirmLabel: string,
    confirmClass: string,
    action: () => void
  ): void {
    this.modal = { visible: true, icon, title, message, confirmLabel, confirmClass, action };
  }

  confirmModal(): void {
    if (this.modal.action) this.modal.action();
    this.modal.visible = false;
  }

  cancelModal(): void {
    this.modal.visible = false;
  }

  // ── Toast ────────────────────────────────────────────────────────────────
  toastMsg2: string | null = null;
  toastType2: 'success' | 'error' = 'success';

  private toast(msg: string, type: 'success' | 'error'): void {
    this.toastMsg2  = msg;
    this.toastType2 = type;
    setTimeout(() => this.toastMsg2 = null, 4000);
  }

  getSentimentClass(sentiment?: string): string {
    switch (sentiment) {
      case 'POSITIVE':     return 'bg-green-100 text-green-700';
      case 'NEGATIVE':     return 'bg-red-100 text-red-700';
      case 'NEUTRAL':      return 'bg-slate-100 text-slate-600';
      case 'APOLOGETIC':   return 'bg-orange-100 text-orange-700';
      case 'CONSTRUCTIVE': return 'bg-blue-100 text-blue-700';
      default:             return 'bg-slate-100 text-slate-500';
    }
  }

  getSentimentIcon(s: string): string {
    return s === 'POSITIVE' ? '😊' : s === 'NEGATIVE' ? '😞' : s === 'NEUTRAL' ? '😐'
         : s === 'APOLOGETIC' ? '🙏' : '💡';
  }

  getSentimentBarColor(s: string): string {
    return s === 'POSITIVE' ? 'bg-green-500' : s === 'NEGATIVE' ? 'bg-red-500'
         : s === 'NEUTRAL'  ? 'bg-slate-400' : s === 'APOLOGETIC' ? 'bg-orange-400' : 'bg-blue-500';
  }

  getRatingBarColor(star: number): string {
    return star >= 4 ? 'bg-green-500' : star === 3 ? 'bg-yellow-400' : 'bg-red-400';
  }

  sentimentCount(s: string): number {
    return this.stats?.sentimentDistribution?.[s] ?? 0;
  }

  maxSentiment(): number {
    if (!this.stats) return 1;
    return Math.max(1, ...Object.values(this.stats.sentimentDistribution));
  }

  ratingCount(star: number): number {
    return this.stats?.ratingDistribution?.[String(star)] ?? 0;
  }

  maxRating(): number {
    if (!this.stats) return 1;
    return Math.max(1, ...Object.values(this.stats.ratingDistribution));
  }

  ratingBarWidth(star: number): number {
    return Math.round((this.ratingCount(star) / this.maxRating()) * 100);
  }

  sentimentBarWidth(s: string): number {
    return Math.round((this.sentimentCount(s) / this.maxSentiment()) * 100);
  }

  healthScore(): number {
    if (!this.stats) return 0;
    let score = 100;
    const total = this.stats.totalFeedbacks;
    if (total > 0) score -= Math.min(30, (this.stats.fraudFlaggedCount / total) * 100 * 0.5);
    score -= Math.min(20, this.stats.pendingAICount * 2);
    if (this.stats.avgGlobalRating < 3) score -= 20;
    if (this.stats.recommendRate < 50) score -= 10;
    return Math.max(0, Math.round(score));
  }

  healthStatus(): string {
    const s = this.healthScore();
    return s >= 80 ? 'EXCELLENT' : s >= 60 ? 'GOOD' : s >= 40 ? 'WARNING' : 'CRITICAL';
  }

  healthColor(): string {
    const s = this.healthStatus();
    return s === 'EXCELLENT' ? 'text-green-500' : s === 'GOOD' ? 'text-blue-500'
         : s === 'WARNING'   ? 'text-orange-500' : 'text-red-600';
  }

  healthGradient(): string {
    const s = this.healthStatus();
    return s === 'EXCELLENT' ? 'from-green-400 to-emerald-600'
         : s === 'GOOD'      ? 'from-blue-400 to-blue-600'
         : s === 'WARNING'   ? 'from-orange-400 to-orange-600'
         :                     'from-red-500 to-red-700';
  }

  stars(n: number): number[] {
    return Array(Math.round(n)).fill(0);
  }

  emptyStars(n: number): number[] {
    return Array(5 - Math.round(n)).fill(0);
  }

  medalIcon(i: number): string {
    return i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '⭐';
  }
}
