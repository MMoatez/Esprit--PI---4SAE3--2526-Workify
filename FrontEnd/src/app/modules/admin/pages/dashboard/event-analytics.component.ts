import {
  Component, OnInit, AfterViewInit,
  ElementRef, ViewChild, OnDestroy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from '../../../../core/services/auth.service';
import {
  Chart, ChartConfiguration,
  LineController, LineElement, PointElement, LinearScale, CategoryScale,
  DoughnutController, ArcElement,
  BarController, BarElement,
  Tooltip, Legend, Filler
} from 'chart.js';

Chart.register(
  LineController, LineElement, PointElement, LinearScale, CategoryScale,
  DoughnutController, ArcElement,
  BarController, BarElement,
  Tooltip, Legend, Filler
);

@Component({
  selector: 'app-event-analytics',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="analytics-wrapper">

      <!-- Header -->
      <div class="analytics-header">
        <div>
          <h2 class="analytics-title">📊 Analytics Événements</h2>
          <p class="analytics-sub">Vue globale · 8 dernières semaines</p>
        </div>
        <button class="btn-refresh" (click)="load()" [disabled]="loading">
          {{ loading ? '⏳' : '🔄 Actualiser' }}
        </button>
      </div>

      <!-- Loading -->
      <div class="skeletons" *ngIf="loading">
        <div class="skeleton-kpi" *ngFor="let i of [1,2,3,4,5,6]"></div>
      </div>

      <ng-container *ngIf="!loading && data">

        <!-- KPI Cards -->
        <div class="kpi-grid">
          <div class="kpi-card kpi-indigo">
            <span class="kpi-icon">🗓️</span>
            <div class="kpi-val">{{ data.kpis.totalEvents }}</div>
            <div class="kpi-label">Événements total</div>
          </div>
          <div class="kpi-card kpi-green">
            <span class="kpi-icon">✅</span>
            <div class="kpi-val">{{ data.kpis.publishedEvents }}</div>
            <div class="kpi-label">Publiés</div>
          </div>
          <div class="kpi-card kpi-blue">
            <span class="kpi-icon">🎟️</span>
            <div class="kpi-val">{{ data.kpis.totalRegistrations }}</div>
            <div class="kpi-label">Inscriptions total</div>
          </div>
          <div class="kpi-card kpi-teal">
            <span class="kpi-icon">✔️</span>
            <div class="kpi-val">{{ data.kpis.confirmedRegistrations }}</div>
            <div class="kpi-label">Confirmées</div>
          </div>
          <div class="kpi-card kpi-purple">
            <span class="kpi-icon">🏅</span>
            <div class="kpi-val">{{ data.kpis.attendedRegistrations }}</div>
            <div class="kpi-label">Présences</div>
          </div>
          <div class="kpi-card kpi-orange">
            <span class="kpi-icon">📈</span>
            <div class="kpi-val">{{ data.kpis.conversionRate }}%</div>
            <div class="kpi-label">Taux conversion</div>
          </div>
        </div>

        <!-- Charts row -->
        <div class="charts-row">

          <!-- Line chart: inscriptions/semaine -->
          <div class="chart-card chart-wide">
            <h3 class="chart-title">📅 Inscriptions par semaine</h3>
            <div class="chart-box">
              <canvas #lineChart></canvas>
            </div>
          </div>

          <!-- Doughnut: catégories -->
          <div class="chart-card">
            <h3 class="chart-title">🏷️ Catégories</h3>
            <div class="chart-box chart-box-sm">
              <canvas #donutChart></canvas>
            </div>
          </div>

        </div>

        <!-- Bar chart: taux de remplissage -->
        <div class="chart-card" *ngIf="data.fillRates?.length">
          <h3 class="chart-title">🔥 Taux de remplissage par événement (%)</h3>
          <div class="chart-box chart-box-bar">
            <canvas #barChart></canvas>
          </div>
        </div>

        <!-- Status distribution pills -->
        <div class="status-row" *ngIf="data.byStatus">
          <div class="status-pill" *ngFor="let s of statusEntries">
            <span class="status-dot" [style.background]="statusColor(s.key)"></span>
            <span class="status-name">{{ s.key }}</span>
            <span class="status-count">{{ s.value }}</span>
          </div>
        </div>

      </ng-container>

      <div class="error-box" *ngIf="error">⚠️ {{ error }}</div>
    </div>
  `,
  styles: [`
    .analytics-wrapper { padding: 0; }
    .analytics-header { display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 20px; }
    .analytics-title { font-size: 18px; font-weight: 800; color: #1e293b; margin: 0; }
    .analytics-sub { font-size: 12px; color: #94a3b8; margin: 2px 0 0; }
    .btn-refresh { padding: 7px 16px; background: #f1f5f9; border: 1px solid #e2e8f0;
      border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; color: #475569;
      transition: all .2s; }
    .btn-refresh:hover:not(:disabled) { background: #e2e8f0; }
    .btn-refresh:disabled { opacity: .5; cursor: not-allowed; }

    /* KPI */
    .kpi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 20px; }
    @media(max-width:640px){ .kpi-grid { grid-template-columns: repeat(2,1fr); } }
    .kpi-card { border-radius: 14px; padding: 16px 18px; display: flex; flex-direction: column;
      gap: 4px; position: relative; overflow: hidden; }
    .kpi-icon { font-size: 22px; margin-bottom: 4px; }
    .kpi-val { font-size: 28px; font-weight: 800; line-height: 1; }
    .kpi-label { font-size: 12px; font-weight: 500; opacity: .8; }
    .kpi-indigo { background: linear-gradient(135deg,#4f46e5,#6366f1); color: #fff; }
    .kpi-green  { background: linear-gradient(135deg,#059669,#10b981); color: #fff; }
    .kpi-blue   { background: linear-gradient(135deg,#2563eb,#3b82f6); color: #fff; }
    .kpi-teal   { background: linear-gradient(135deg,#0891b2,#06b6d4); color: #fff; }
    .kpi-purple { background: linear-gradient(135deg,#7c3aed,#8b5cf6); color: #fff; }
    .kpi-orange { background: linear-gradient(135deg,#d97706,#f59e0b); color: #fff; }

    /* Charts */
    .charts-row { display: grid; grid-template-columns: 2fr 1fr; gap: 16px; margin-bottom: 16px; }
    @media(max-width:768px){ .charts-row { grid-template-columns: 1fr; } }
    .chart-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 16px;
      padding: 20px; box-shadow: 0 1px 4px rgba(0,0,0,.05); margin-bottom: 0; }
    .chart-title { font-size: 14px; font-weight: 700; color: #334155; margin: 0 0 14px; }
    .chart-box { position: relative; height: 240px; }
    .chart-box-sm { height: 220px; }
    .chart-box-bar { height: 200px; }
    .chart-card:last-child { margin-bottom: 16px; }

    /* Status pills */
    .status-row { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 4px; }
    .status-pill { display: flex; align-items: center; gap: 8px; background: #f8fafc;
      border: 1px solid #e2e8f0; border-radius: 999px; padding: 6px 14px; font-size: 13px; }
    .status-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
    .status-name { font-weight: 600; color: #475569; }
    .status-count { font-weight: 800; color: #1e293b; margin-left: 4px; }

    /* Skeleton */
    .skeletons { display: grid; grid-template-columns: repeat(3,1fr); gap: 12px; margin-bottom: 20px; }
    .skeleton-kpi { height: 90px; background: #f1f5f9; border-radius: 14px; animation: pulse 1.4s ease-in-out infinite; }
    @keyframes pulse { 0%,100%{ opacity:1 } 50%{ opacity:.5 } }
    .error-box { background: #fef2f2; border: 1px solid #fecaca; border-radius: 10px;
      padding: 12px 16px; color: #dc2626; font-size: 13px; }
  `]
})
export class EventAnalyticsComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('lineChart') lineRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('donutChart') donutRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('barChart') barRef!: ElementRef<HTMLCanvasElement>;

  data: any = null;
  loading = false;
  error = '';
  statusEntries: { key: string; value: number }[] = [];

  private lineChart?: Chart;
  private donutChart?: Chart;
  private barChart?: Chart;

  private readonly CATEGORY_COLORS = [
    '#6366f1','#10b981','#3b82f6','#f59e0b','#ef4444',
    '#8b5cf6','#06b6d4','#ec4899','#84cc16','#f97316'
  ];

  constructor(private http: HttpClient, private auth: AuthService) {}

  ngOnInit(): void { this.load(); }
  ngAfterViewInit(): void {}

  ngOnDestroy(): void {
    this.lineChart?.destroy();
    this.donutChart?.destroy();
    this.barChart?.destroy();
  }

  load(): void {
    this.loading = true;
    this.error = '';
    const token = this.auth.getToken();
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    this.http.get<any>('http://localhost:8096/api/events/analytics/dashboard', { headers })
      .subscribe({
        next: d => {
          this.data = d;
          this.statusEntries = Object.entries(d.byStatus || {}).map(([key, value]) => ({ key, value: value as number }));
          this.loading = false;
          setTimeout(() => this.renderCharts(), 100);
        },
        error: () => { this.error = 'Impossible de charger les analytics.'; this.loading = false; }
      });
  }

  private renderCharts(): void {
    this.renderLine();
    this.renderDonut();
    this.renderBar();
  }

  private renderLine(): void {
    if (!this.lineRef?.nativeElement || !this.data?.weeklyRegistrations) return;
    this.lineChart?.destroy();
    const cfg: ChartConfiguration<'line'> = {
      type: 'line',
      data: {
        labels: this.data.weeklyRegistrations.labels,
        datasets: [{
          label: 'Inscriptions',
          data: this.data.weeklyRegistrations.data,
          borderColor: '#6366f1',
          backgroundColor: 'rgba(99,102,241,.12)',
          borderWidth: 2.5,
          pointRadius: 4,
          pointBackgroundColor: '#6366f1',
          fill: true,
          tension: 0.4
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { mode: 'index', intersect: false } },
        scales: {
          y: { beginAtZero: true, ticks: { stepSize: 1 }, grid: { color: '#f1f5f9' } },
          x: { grid: { display: false }, ticks: { font: { size: 11 } } }
        }
      }
    };
    this.lineChart = new Chart(this.lineRef.nativeElement, cfg);
  }

  private renderDonut(): void {
    if (!this.donutRef?.nativeElement || !this.data?.byCategory) return;
    this.donutChart?.destroy();
    const entries = Object.entries(this.data.byCategory);
    const cfg: ChartConfiguration<'doughnut'> = {
      type: 'doughnut',
      data: {
        labels: entries.map(([k]) => k),
        datasets: [{
          data: entries.map(([, v]) => v as number),
          backgroundColor: this.CATEGORY_COLORS.slice(0, entries.length),
          borderWidth: 2,
          borderColor: '#fff'
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { position: 'right', labels: { boxWidth: 12, font: { size: 11 } } },
          tooltip: { callbacks: { label: (ctx: any) => ` ${ctx.label}: ${ctx.parsed}` } }
        },
        cutout: '65%'
      }
    };
    this.donutChart = new Chart(this.donutRef.nativeElement, cfg);
  }

  private renderBar(): void {
    if (!this.barRef?.nativeElement || !this.data?.fillRates?.length) return;
    this.barChart?.destroy();
    const rates = this.data.fillRates;
    const cfg: ChartConfiguration<'bar'> = {
      type: 'bar',
      data: {
        labels: rates.map((r: any) => r.title),
        datasets: [{
          label: 'Taux remplissage (%)',
          data: rates.map((r: any) => r.fillRate),
          backgroundColor: rates.map((r: any) =>
            r.fillRate >= 80 ? '#10b981' : r.fillRate >= 50 ? '#f59e0b' : '#ef4444'),
          borderRadius: 6,
          borderSkipped: false
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, max: 100, grid: { color: '#f1f5f9' },
            ticks: { callback: (v: any) => v + '%' } },
          x: { grid: { display: false }, ticks: { font: { size: 11 } } }
        }
      }
    };
    this.barChart = new Chart(this.barRef.nativeElement, cfg);
  }

  statusColor(s: string): string {
    const m: Record<string, string> = {
      PUBLISHED: '#10b981', DRAFT: '#94a3b8',
      ARCHIVED: '#64748b', ENRICHED: '#3b82f6', PENDING_PARTNERS: '#f59e0b'
    };
    return m[s] || '#cbd5e1';
  }
}
