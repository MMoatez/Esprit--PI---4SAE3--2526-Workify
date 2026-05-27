import { Component, OnInit } from '@angular/core';
import { SubscriptionService } from '../../../../core/services/subscription.service';
import { SubscriptionResponse, StatutsSubscription, PaymentMethodDisplay } from '../../../../core/models/subscription.model';
import { DurationDisplay } from '../../../../core/models/pack.model';

const TOTAL_REJECT_PREFIX = 'TOTAL_REJECT::';

@Component({
  standalone: false,
  selector: 'app-subscription-management',
  templateUrl: './subscription-management.component.html',
  styles: [`
    .trend-card {
      background: linear-gradient(145deg, #0f172a, #111827);
      border-color: #1f2937;
    }

    .trend-chart {
      height: 250px;
      background:
        radial-gradient(circle at 70% 0%, rgba(59, 130, 246, 0.16), transparent 55%),
        linear-gradient(180deg, #101a35, #0a1226 68%);
      border: 1px solid rgba(56, 189, 248, 0.16);
    }

    .trend-grid {
      position: absolute;
      inset: 0;
      background-image:
        linear-gradient(to right, rgba(148, 163, 184, 0.12) 1px, transparent 1px),
        linear-gradient(to bottom, rgba(148, 163, 184, 0.12) 1px, transparent 1px);
      background-size: 12.5% 20%;
      pointer-events: none;
    }

    .trend-svg {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      z-index: 2;
    }

    .trend-line {
      fill: none;
      stroke: #3b82f6;
      stroke-width: 0.9;
      stroke-linecap: round;
      stroke-linejoin: round;
    }

    .trend-area {
      fill: rgba(14, 165, 233, 0.14);
    }

    .trend-band {
      fill: none;
      stroke-width: 0.6;
      stroke-dasharray: 2 2;
    }

    .trend-band.upper {
      stroke: rgba(244, 63, 94, 0.75);
    }

    .trend-band.lower {
      stroke: rgba(20, 184, 166, 0.75);
    }

    .trend-candle {
      position: absolute;
      top: 0;
      bottom: 0;
      width: 10px;
      transform: translateX(-50%);
      z-index: 3;
    }

    .trend-wick {
      position: absolute;
      left: 50%;
      transform: translateX(-50%);
      width: 1.6px;
      background: rgba(148, 163, 184, 0.95);
    }

    .trend-body {
      position: absolute;
      left: 50%;
      transform: translateX(-50%);
      width: 6px;
      border-radius: 2px;
    }

    .trend-body.bull {
      background: linear-gradient(180deg, #14b8a6, #10b981);
      box-shadow: 0 0 8px rgba(16, 185, 129, 0.4);
    }

    .trend-body.bear {
      background: linear-gradient(180deg, #f97316, #ef4444);
      box-shadow: 0 0 8px rgba(239, 68, 68, 0.4);
    }

    .trend-months {
      position: absolute;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 4;
      display: grid;
      grid-template-columns: repeat(6, minmax(0, 1fr));
      gap: 4px;
      padding: 0 12px 8px;
    }

    .trend-month-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      font-size: 11px;
      color: #93c5fd;
    }

    .trend-month-item strong {
      color: #e2e8f0;
      font-size: 12px;
    }
  `]
})
export class SubscriptionManagementComponent implements OnInit {
  subscriptions: SubscriptionResponse[] = [];
  filtered: SubscriptionResponse[] = [];
  loading = false;
  error = '';
  successMessage = '';
  searchTerm = '';
  fromDate = '';
  toDate = '';
  exporting = false;

  filterStatus = 'ALL';
  cancelConfirmId: number | null = null;
  rejectModalId: number | null = null;
  rejectReason = '';
  rejectMode: 'standard' | 'total' = 'standard';

  paymentMethodDisplay = PaymentMethodDisplay;
  StatutsSubscription = StatutsSubscription;

  readonly RECEIPT_BASE = 'http://localhost:8089/';

  constructor(private subscriptionService: SubscriptionService) {}

  ngOnInit(): void { this.loadAll(); }

  loadAll(): void {
    this.loading = true;
    this.subscriptionService.getAllSubscriptions().subscribe({
      next: (data) => {
        this.subscriptions = data.sort((a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        this.applyFilter();
        this.loading = false;
      },
      error: () => { this.error = 'Failed to load subscriptions.'; this.loading = false; }
    });
  }

  applyFilter(): void {
    const term = this.searchTerm.trim().toLowerCase();

    const byStatus = this.filterStatus === 'ALL'
      ? [...this.subscriptions]
      : this.subscriptions.filter(s => this.getDisplayStatus(s) === this.filterStatus);

    this.filtered = !term
      ? byStatus
      : byStatus.filter(s =>
          s.userFullName.toLowerCase().includes(term) ||
          s.userEmail.toLowerCase().includes(term)
        );
  }

  onFilterChange(status: string): void { this.filterStatus = status; this.applyFilter(); }

  onSearchChange(): void { this.applyFilter(); }

  exportExcel(): void {
    this.clearMessages();
    this.exporting = true;

    this.subscriptionService.exportSubscriptions(this.fromDate || undefined, this.toDate || undefined).subscribe({
      next: (blob) => {
        const fileName = this.buildExportFileName();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        window.URL.revokeObjectURL(url);
        this.successMessage = 'Subscriptions exported successfully.';
        this.exporting = false;
      },
      error: () => {
        this.error = 'Failed to export subscriptions.';
        this.exporting = false;
      }
    });
  }

  approve(id: number): void {
    this.clearMessages();
    this.subscriptionService.approveSubscription(id).subscribe({
      next: () => { this.successMessage = 'Subscription approved successfully.'; this.loadAll(); },
      error: () => { this.error = 'Failed to approve subscription.'; }
    });
  }

  reactivate(id: number): void {
    this.clearMessages();
    this.subscriptionService.approveSubscription(id).subscribe({
      next: () => { this.successMessage = 'Subscription reactivated successfully.'; this.loadAll(); },
      error: () => { this.error = 'Failed to reactivate subscription.'; }
    });
  }

  openRejectModal(id: number, mode: 'standard' | 'total' = 'standard'): void {
    this.rejectModalId = id;
    this.rejectMode = mode;
    this.rejectReason = '';
  }

  closeRejectModal(): void {
    this.rejectModalId = null;
    this.rejectMode = 'standard';
  }

  confirmReject(): void {
    if (!this.rejectModalId) return;

    if (this.rejectMode === 'total' && !this.rejectReason.trim()) {
      this.error = 'Reject reason is required for total rejection.';
      return;
    }

    this.clearMessages();
    const reason = this.rejectReason.trim() || 'Rejected by admin.';
    const payloadReason = this.rejectMode === 'total'
      ? `${TOTAL_REJECT_PREFIX}${reason}`
      : reason;

    this.subscriptionService.rejectSubscription(this.rejectModalId, payloadReason).subscribe({
      next: () => {
        this.successMessage = this.rejectMode === 'total'
          ? 'Subscription totally rejected.'
          : 'Subscription rejected.';
        this.rejectModalId = null;
        this.rejectMode = 'standard';
        this.loadAll();
      },
      error: () => { this.error = 'Failed to reject subscription.'; }
    });
  }

  approveRejectedWithOverride(id: number): void {
    this.clearMessages();
    this.subscriptionService.aiOverride(id, true, 'Approved by admin override after AI rejection').subscribe({
      next: () => {
        this.successMessage = 'AI decision overridden: subscription approved.';
        this.loadAll();
      },
      error: () => {
        this.error = 'Failed to override AI rejection.';
      }
    });
  }

  getAiMetadata(sub: SubscriptionResponse): {
    confidence?: number;
    status?: string;
    reasons?: string[];
    extracted_data?: {
      amount?: string | null;
      date?: string | null;
      bank?: string | null;
      transaction_id?: string | null;
    };
  } | null {
    if (!sub.extractedMetadata) {
      return null;
    }

    try {
      const parsed = JSON.parse(sub.extractedMetadata);
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch {
      return null;
    }
  }

  getAiExtractedField(sub: SubscriptionResponse, field: 'amount' | 'date' | 'bank' | 'transaction_id'): string {
    const metadata = this.getAiMetadata(sub);
    const extracted = metadata?.extracted_data;
    const value = extracted?.[field];
    return value ? String(value) : '-';
  }

  getAiReasons(sub: SubscriptionResponse): string {
    const metadata = this.getAiMetadata(sub);
    const reasons = metadata?.reasons;
    if (!reasons || !Array.isArray(reasons) || reasons.length === 0) {
      return '-';
    }
    return reasons.join(' | ');
  }

  getDisplayedAiConfidence(sub: SubscriptionResponse): string {
    const metadata = this.getAiMetadata(sub);
    const confidence = sub.receiptConfidence ?? metadata?.confidence;
    if (confidence === null || confidence === undefined || Number.isNaN(Number(confidence))) {
      return '-';
    }
    return `${Number(confidence).toFixed(1)}%`;
  }

  isTotallyRejected(sub: SubscriptionResponse): boolean {
    const reason = (sub.rejectionReason || sub.aiRejectionReason || '').trim();
    return reason.startsWith(TOTAL_REJECT_PREFIX);
  }

  getReadableRejectReason(sub: SubscriptionResponse): string {
    const reason = (sub.rejectionReason || '').trim();
    if (!reason) {
      return '';
    }

    return reason.startsWith(TOTAL_REJECT_PREFIX)
      ? reason.substring(TOTAL_REJECT_PREFIX.length).trim()
      : reason;
  }

  confirmCancel(id: number): void { this.cancelConfirmId = id; }
  cancelCancel(): void { this.cancelConfirmId = null; }

  cancelSubscription(id: number): void {
    this.clearMessages();
    this.subscriptionService.cancelSubscription(id).subscribe({
      next: () => {
        this.successMessage = 'Subscription cancelled.';
        this.cancelConfirmId = null;
        this.loadAll();
        setTimeout(() => this.successMessage = '', 3000);
      },
      error: () => { this.error = 'Failed to cancel subscription.'; }
    });
  }

  getDurationLabel(duration: string | null | undefined): string {
    if (!duration) return '-';
    return DurationDisplay[duration as keyof typeof DurationDisplay] || duration;
  }

  formatDate(date: string | null | undefined): string {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  isExpired(endDate: string | null | undefined): boolean {
    if (!endDate) return false;
    return new Date(endDate) < new Date();
  }

  getDisplayStatus(sub: SubscriptionResponse): string {
    if (sub.statuts === StatutsSubscription.ACTIVE && this.isExpired(sub.endDate)) {
      return 'EXPIRED';
    }
    return sub.statuts;
  }

  get pendingCount(): number { return this.subscriptions.filter(s => this.getDisplayStatus(s) === StatutsSubscription.PENDING).length; }
  get activeCount(): number  { return this.subscriptions.filter(s => this.getDisplayStatus(s) === StatutsSubscription.ACTIVE).length; }
  get expiredCount(): number { return this.subscriptions.filter(s => this.getDisplayStatus(s) === 'EXPIRED').length; }
  get totalRevenue(): number {
    return this.subscriptions
      .filter(s => this.getDisplayStatus(s) === StatutsSubscription.ACTIVE)
      .reduce((sum, s) => sum + s.amountPaid, 0);
  }

  get packUsage(): Array<{ name: string; count: number; percent: number }> {
    const map = new Map<string, number>();
    this.subscriptions.forEach(s => map.set(s.packName, (map.get(s.packName) || 0) + 1));
    const total = this.subscriptions.length || 1;
    return [...map.entries()]
      .map(([name, count]) => ({ name, count, percent: (count / total) * 100 }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }

  get mostUsedPack(): string {
    return this.packUsage.length ? `${this.packUsage[0].name} (${this.packUsage[0].count})` : '-';
  }

  get paymentBreakdown(): Array<{ label: string; count: number; percent: number }> {
    const total = this.subscriptions.length || 1;
    const methods = Object.keys(this.paymentMethodDisplay) as Array<keyof typeof PaymentMethodDisplay>;
    return methods.map(method => {
      const count = this.subscriptions.filter(s => s.paymentMethod === method).length;
      return {
        label: this.paymentMethodDisplay[method],
        count,
        percent: (count / total) * 100
      };
    });
  }

  get statusBreakdown(): Array<{ label: string; count: number; percent: number }> {
    const buckets = ['ACTIVE', 'EXPIRED', 'PENDING', 'INACTIVE', 'REJECTED'];
    const total = this.subscriptions.length || 1;
    return buckets.map(label => {
      const count = this.subscriptions.filter(s => this.getDisplayStatus(s) === label).length;
      return { label, count, percent: (count / total) * 100 };
    });
  }

  get statusActivePercent(): number {
    return this.statusBreakdown.find(s => s.label === 'ACTIVE')?.percent || 0;
  }

  get statusExpiredPercent(): number {
    return this.statusBreakdown.find(s => s.label === 'EXPIRED')?.percent || 0;
  }

  get statusPendingPercent(): number {
    return this.statusBreakdown.find(s => s.label === 'PENDING')?.percent || 0;
  }

  get statusInactivePercent(): number {
    return this.statusBreakdown.find(s => s.label === 'INACTIVE')?.percent || 0;
  }

  get statusRejectedPercent(): number {
    return this.statusBreakdown.find(s => s.label === 'REJECTED')?.percent || 0;
  }

  get statusConicGradient(): string {
    const slices = this.statusBreakdown;
    const total = slices.reduce((sum, item) => sum + item.percent, 0);
    if (total <= 0) {
      return 'conic-gradient(#e5e7eb 0 100%)';
    }

    let cursor = 0;
    const segments = slices.map(slice => {
      const start = cursor;
      const end = cursor + slice.percent;
      cursor = end;
      return `${this.getStatusColor(slice.label)} ${start}% ${end}%`;
    });

    return `conic-gradient(${segments.join(', ')})`;
  }

  getStatusColor(label: string): string {
    switch (label) {
      case 'ACTIVE':   return '#16a34a';
      case 'EXPIRED':  return '#ea580c';
      case 'PENDING':  return '#d97706';
      case 'INACTIVE': return '#64748b';
      case 'REJECTED': return '#dc2626';
      default:         return '#9ca3af';
    }
  }

  get trendSeries(): Array<{ label: string; count: number; x: number; y: number }> {
    const now = new Date();
    const raw: Array<{ label: string; count: number }> = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleString('en-US', { month: 'short' });
      const count = this.subscriptions.filter(s => {
        const created = new Date(s.createdAt);
        return created.getFullYear() === d.getFullYear() && created.getMonth() === d.getMonth();
      }).length;
      raw.push({ label, count });
    }

    const max = Math.max(...raw.map(p => p.count), 1);
    const count = raw.length;

    return raw.map((p, i) => {
      const x = count === 1 ? 50 : 6 + (i * 88) / (count - 1);
      const y = 88 - (p.count / max) * 60;
      return { label: p.label, count: p.count, x, y };
    });
  }

  get trendLinePoints(): string {
    return this.trendSeries.map(p => `${p.x},${p.y}`).join(' ');
  }

  get trendAreaPoints(): string {
    const series = this.trendSeries;
    if (!series.length) return '';

    const first = series[0];
    const last = series[series.length - 1];
    const line = series.map(p => `${p.x},${p.y}`).join(' ');

    return `${first.x},88 ${line} ${last.x},88`;
  }

  get trendUpperBandPoints(): string {
    const s = this.trendSeries;
    if (!s.length) return '';
    return s
      .map((p, i) => {
        const prev = s[i - 1]?.y ?? p.y;
        const next = s[i + 1]?.y ?? p.y;
        const avg = (prev + p.y + next) / 3;
        const upper = Math.max(8, avg - 10);
        return `${p.x},${upper}`;
      })
      .join(' ');
  }

  get trendLowerBandPoints(): string {
    const s = this.trendSeries;
    if (!s.length) return '';
    return s
      .map((p, i) => {
        const prev = s[i - 1]?.y ?? p.y;
        const next = s[i + 1]?.y ?? p.y;
        const avg = (prev + p.y + next) / 3;
        const lower = Math.min(88, avg + 10);
        return `${p.x},${lower}`;
      })
      .join(' ');
  }

  get trendCandles(): Array<{ x: number; wickTop: number; wickHeight: number; bodyTop: number; bodyHeight: number; bullish: boolean }> {
    const s = this.trendSeries;
    return s.map((p, i) => {
      const prevY = s[i - 1]?.y ?? Math.min(88, p.y + 8);
      const openY = prevY;
      const closeY = p.y;
      const highY = Math.max(6, Math.min(openY, closeY) - 6);
      const lowY = Math.min(88, Math.max(openY, closeY) + 6);

      const bodyTop = Math.min(openY, closeY);
      const bodyHeight = Math.max(2.2, Math.abs(openY - closeY));

      return {
        x: p.x,
        wickTop: highY,
        wickHeight: Math.max(2, lowY - highY),
        bodyTop,
        bodyHeight,
        bullish: closeY <= openY
      };
    });
  }

  get trendBars(): Array<{ label: string; count: number; percent: number }> {
    const now = new Date();
    const points: Array<{ label: string; count: number; percent: number }> = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleString('en-US', { month: 'short' });
      const count = this.subscriptions.filter(s => {
        const created = new Date(s.createdAt);
        return created.getFullYear() === d.getFullYear() && created.getMonth() === d.getMonth();
      }).length;
      points.push({ label, count, percent: 0 });
    }

    const max = Math.max(...points.map(p => p.count), 1);
    return points.map(p => ({ ...p, percent: (p.count / max) * 100 }));
  }

  private buildExportFileName(): string {
    const suffix = this.fromDate || this.toDate
      ? `_${this.fromDate || 'start'}_${this.toDate || 'end'}`
      : '';
    return `subscriptions${suffix}.xlsx`;
  }

  private clearMessages(): void { this.error = ''; this.successMessage = ''; }
}
