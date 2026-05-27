import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { UserProfileService } from '../../../core/services/user-profile.service';

export interface MonthSlot   { month: string; avgRating: number; count: number; }
export interface FreelancerAnalytics {
  freelancerId: number;
  totalFeedbacks: number;
  totalContracts: number;
  feedbackRate: number;
  avgGlobalRating: number;
  avgCommunicationRating: number;
  avgQualityRating: number;
  avgDeadlineRating: number;
  avgProfessionalismRating: number;
  recommendRate: number;
  responseRate: number;
  ratingDistribution: Record<string, number>;
  monthlyEvolution: MonthSlot[];
  bestMonth: MonthSlot | null;
  worstMonth: MonthSlot | null;
  marketAvgRating: number;
  rankPercentile: number;
}

@Component({
  standalone: true,
  imports: [CommonModule, RouterModule],
  selector: 'app-freelancer-analytics',
  templateUrl: './freelancer-analytics.component.html'
})
export class FreelancerAnalyticsComponent implements OnInit {
  data: FreelancerAnalytics | null = null;
  loading = true;
  error: string | null = null;

  readonly CHART_W = 600;
  readonly CHART_H = 140;
  readonly PAD_X   = 40;
  readonly PAD_Y   = 15;

  constructor(private http: HttpClient, private profileService: UserProfileService) {}

  ngOnInit(): void {
    this.profileService.getMe().subscribe({
      next: (p) => this.loadAnalytics(p.id),
      error: () => { this.error = 'Unable to load profile.'; this.loading = false; }
    });
  }

  loadAnalytics(id: number): void {
    this.http.get<FreelancerAnalytics>(`/api/feedback/analytics/freelancer/${id}`).subscribe({
      next: (d) => { this.data = d; this.loading = false; },
      error: () => { this.error = 'Unable to load analytics. Make sure the feedback service is running.'; this.loading = false; }
    });
  }

  // ── SVG Line Chart ────────────────────────────────────────────────────────

  svgPoints(): string {
    const pts = this.data?.monthlyEvolution ?? [];
    if (pts.length < 2) return '';
    const n = pts.length;
    const minR = 1, maxR = 5;
    const w = this.CHART_W - this.PAD_X * 2;
    const h = this.CHART_H - this.PAD_Y * 2;
    return pts.map((p, i) => {
      const x = this.PAD_X + (i / (n - 1)) * w;
      const y = this.PAD_Y + ((maxR - p.avgRating) / (maxR - minR)) * h;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
  }

  svgDots(): { x: number; y: number; r: number; label: string; month: string }[] {
    const pts = this.data?.monthlyEvolution ?? [];
    if (!pts.length) return [];
    const n = pts.length;
    const minR = 1, maxR = 5;
    const w = this.CHART_W - this.PAD_X * 2;
    const h = this.CHART_H - this.PAD_Y * 2;
    return pts.map((p, i) => ({
      x: this.PAD_X + (n > 1 ? (i / (n - 1)) * w : w / 2),
      y: this.PAD_Y + ((maxR - p.avgRating) / (maxR - minR)) * h,
      r: 4,
      label: String(p.avgRating),
      month: p.month
    }));
  }

  svgMarketLine(): string {
    if (!this.data) return '';
    const minR = 1, maxR = 5;
    const h = this.CHART_H - this.PAD_Y * 2;
    const y = (this.PAD_Y + ((maxR - this.data.marketAvgRating) / (maxR - minR)) * h).toFixed(1);
    return `${this.PAD_X},${y} ${this.CHART_W - this.PAD_X},${y}`;
  }

  xLabels(): { x: number; label: string }[] {
    const pts = this.data?.monthlyEvolution ?? [];
    if (!pts.length) return [];
    const n = pts.length;
    const w = this.CHART_W - this.PAD_X * 2;
    const step = n > 6 ? Math.ceil(n / 6) : 1;
    return pts
      .filter((_, i) => i % step === 0 || i === n - 1)
      .map((p, idx, arr) => {
        const orig = pts.indexOf(p);
        const x = this.PAD_X + (n > 1 ? (orig / (n - 1)) * w : w / 2);
        return { x, label: p.month };
      });
  }

  // ── Rating distribution ───────────────────────────────────────────────────

  ratingStars = [5, 4, 3, 2, 1];

  ratingCount(star: number): number {
    return this.data?.ratingDistribution?.[String(star)] ?? 0;
  }

  maxRatingCount(): number {
    if (!this.data) return 1;
    return Math.max(1, ...Object.values(this.data.ratingDistribution));
  }

  ratingBarWidth(star: number): number {
    return Math.round((this.ratingCount(star) / this.maxRatingCount()) * 100);
  }

  ratingBarColor(star: number): string {
    return star >= 4 ? 'bg-green-500' : star === 3 ? 'bg-yellow-400' : 'bg-red-400';
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  stars(n: number):      number[] { return Array(Math.round(n)).fill(0); }
  emptyStars(n: number): number[] { return Array(5 - Math.round(n)).fill(0); }

  aboveMarket(): boolean {
    return !!this.data && this.data.avgGlobalRating > this.data.marketAvgRating;
  }

  trend(): 'up' | 'down' | 'stable' {
    const pts = this.data?.monthlyEvolution ?? [];
    if (pts.length < 2) return 'stable';
    const last = pts[pts.length - 1].avgRating;
    const prev = pts[pts.length - 2].avgRating;
    return last > prev ? 'up' : last < prev ? 'down' : 'stable';
  }

  trendIcon(): string {
    const t = this.trend();
    return t === 'up' ? '📈' : t === 'down' ? '📉' : '➡️';
  }

  trendColor(): string {
    const t = this.trend();
    return t === 'up' ? 'text-green-600' : t === 'down' ? 'text-red-500' : 'text-slate-500';
  }

  dims = [
    { label: 'Communication',   key: 'avgCommunicationRating',   icon: '💬' },
    { label: 'Quality',         key: 'avgQualityRating',          icon: '🎯' },
    { label: 'Deadline',        key: 'avgDeadlineRating',         icon: '⏱' },
    { label: 'Professionalism', key: 'avgProfessionalismRating',  icon: '🏆' },
  ];

  dimVal(key: string): number {
    return (this.data as any)?.[key] ?? 0;
  }
}
