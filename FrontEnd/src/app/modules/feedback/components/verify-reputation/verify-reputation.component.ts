import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FeedbackService } from '../../../../core/services/feedback.service';
import { FreelancerSummaryDto } from '../../../../core/models/feedback.model';

@Component({
  selector: 'app-verify-reputation',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="vr-page">

      <!-- Loading -->
      <div *ngIf="loading" class="vr-loading">
        <div class="vr-spinner"></div>
        <p>Verifying reputation...</p>
      </div>

      <!-- Error -->
      <div *ngIf="!loading && error" class="vr-error">
        <div class="vr-error-icon">✗</div>
        <h2>Verification Failed</h2>
        <p>{{ error }}</p>
      </div>

      <!-- Verified card -->
      <div *ngIf="!loading && summary && !error" class="vr-card">

        <!-- Header -->
        <div class="vr-header">
          <div class="vr-logo">
            <span class="vr-logo-icon">W</span>
            <span class="vr-logo-text">Workify</span>
          </div>
          <div class="vr-verified-badge">
            <span class="vr-check">✓</span>
            <span>VERIFIED REPUTATION</span>
          </div>
        </div>

        <!-- Freelancer info -->
        <div class="vr-freelancer">
          <div class="vr-avatar">{{ initials }}</div>
          <div>
            <h1 class="vr-name">{{ freelancerName }}</h1>
            <p class="vr-subtitle">Freelancer · Workify Platform</p>
          </div>
        </div>

        <!-- Score global -->
        <div class="vr-score-main">
          <div class="vr-stars">
            <span *ngFor="let s of filledStars" class="vr-star filled">★</span>
            <span *ngFor="let s of emptyStars"  class="vr-star empty">★</span>
          </div>
          <span class="vr-score-value">{{ summary.avgGlobal | number:'1.1-1' }} / 5.0</span>
        </div>

        <!-- Stats -->
        <div class="vr-stats">
          <div class="vr-stat">
            <span class="vr-stat-value">{{ summary.totalFeedbacks }}</span>
            <span class="vr-stat-label">Verified Reviews</span>
          </div>
          <div class="vr-stat">
            <span class="vr-stat-value">{{ summary.recommendationRate | number:'1.0-0' }}%</span>
            <span class="vr-stat-label">Would Recommend</span>
          </div>
          <div class="vr-stat">
            <span class="vr-stat-value">{{ generatedDate }}</span>
            <span class="vr-stat-label">Report Date</span>
          </div>
        </div>

        <!-- Dimension scores -->
        <div class="vr-dimensions">
          <div class="vr-dim" *ngFor="let d of dimensions">
            <span class="vr-dim-label">{{ d.label }}</span>
            <div class="vr-dim-bar">
              <div class="vr-dim-fill" [style.width.%]="d.value * 20"></div>
            </div>
            <span class="vr-dim-score">{{ d.value | number:'1.1-1' }}</span>
          </div>
        </div>

        <!-- Footer -->
        <div class="vr-footer">
          <p class="vr-seal">
            🔒 This reputation report has been officially verified by Workify.<br>
            Data is sourced exclusively from real, authenticated client reviews.
          </p>
          <a [routerLink]="['/freelancers', freelancerId]" class="vr-profile-btn">
            View Full Profile →
          </a>
        </div>

      </div>

    </div>
  `,
  styles: [`
    .vr-page {
      min-height: 100vh;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      display: flex; align-items: center; justify-content: center;
      padding: 24px; font-family: 'Segoe UI', sans-serif;
    }
    .vr-loading { text-align: center; color: #fff; }
    .vr-spinner {
      width: 48px; height: 48px; border: 4px solid rgba(255,255,255,0.3);
      border-top-color: #fff; border-radius: 50%;
      animation: spin 0.8s linear infinite; margin: 0 auto 16px;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    .vr-error { text-align: center; color: #fff; }
    .vr-error-icon { font-size: 3rem; color: #ff6b6b; margin-bottom: 12px; }

    .vr-card {
      background: #fff; border-radius: 20px; padding: 36px;
      max-width: 520px; width: 100%;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    }

    /* Header */
    .vr-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 28px; }
    .vr-logo { display: flex; align-items: center; gap: 8px; }
    .vr-logo-icon {
      width: 32px; height: 32px; background: #6c63ff; color: #fff;
      border-radius: 8px; display: flex; align-items: center; justify-content: center;
      font-weight: 800; font-size: 1rem;
    }
    .vr-logo-text { font-weight: 700; font-size: 1.1rem; color: #1a1a2e; }
    .vr-verified-badge {
      display: flex; align-items: center; gap: 6px;
      background: #e8f5e9; color: #2e7d32;
      padding: 6px 12px; border-radius: 20px;
      font-size: 0.72rem; font-weight: 700; letter-spacing: 0.5px;
    }
    .vr-check {
      width: 18px; height: 18px; background: #2ecc71; color: #fff;
      border-radius: 50%; display: flex; align-items: center; justify-content: center;
      font-size: 0.7rem; font-weight: 800;
    }

    /* Freelancer */
    .vr-freelancer { display: flex; align-items: center; gap: 16px; margin-bottom: 24px; }
    .vr-avatar {
      width: 60px; height: 60px; background: linear-gradient(135deg, #6c63ff, #764ba2);
      color: #fff; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 1.4rem; font-weight: 700; flex-shrink: 0;
    }
    .vr-name { font-size: 1.4rem; font-weight: 700; color: #1a1a2e; margin: 0 0 4px; }
    .vr-subtitle { font-size: 0.85rem; color: #888; margin: 0; }

    /* Score */
    .vr-score-main {
      display: flex; align-items: center; gap: 12px;
      background: #f8f7ff; border-radius: 12px; padding: 16px 20px;
      margin-bottom: 20px;
    }
    .vr-stars { display: flex; gap: 3px; }
    .vr-star { font-size: 1.6rem; }
    .vr-star.filled { color: #f59e0b; }
    .vr-star.empty  { color: #e5e7eb; }
    .vr-score-value { font-size: 1.5rem; font-weight: 800; color: #6c63ff; margin-left: auto; }

    /* Stats */
    .vr-stats {
      display: grid; grid-template-columns: repeat(3, 1fr);
      gap: 12px; margin-bottom: 24px;
    }
    .vr-stat {
      text-align: center; background: #fafafa;
      border: 1px solid #f0f0f0; border-radius: 10px; padding: 12px 8px;
    }
    .vr-stat-value { display: block; font-size: 1.2rem; font-weight: 700; color: #1a1a2e; }
    .vr-stat-label { font-size: 0.72rem; color: #9ca3af; display: block; margin-top: 2px; }

    /* Dimensions */
    .vr-dimensions { display: flex; flex-direction: column; gap: 10px; margin-bottom: 24px; }
    .vr-dim { display: flex; align-items: center; gap: 10px; }
    .vr-dim-label { font-size: 0.82rem; color: #555; width: 120px; flex-shrink: 0; }
    .vr-dim-bar {
      flex: 1; height: 8px; background: #e9e9f0; border-radius: 4px; overflow: hidden;
    }
    .vr-dim-fill { height: 100%; background: #6c63ff; border-radius: 4px; transition: width 0.6s ease; }
    .vr-dim-score { font-size: 0.82rem; font-weight: 700; color: #6c63ff; width: 28px; text-align: right; }

    /* Footer */
    .vr-footer { border-top: 1px solid #f0f0f0; padding-top: 20px; text-align: center; }
    .vr-seal { font-size: 0.78rem; color: #9ca3af; line-height: 1.6; margin-bottom: 16px; }
    .vr-profile-btn {
      display: inline-block; background: #6c63ff; color: #fff;
      padding: 10px 24px; border-radius: 8px; text-decoration: none;
      font-weight: 600; font-size: 0.9rem; transition: background 0.2s;
    }
    .vr-profile-btn:hover { background: #574fd6; }
  `]
})
export class VerifyReputationComponent implements OnInit {

  freelancerId!: number;
  freelancerName = '';
  summary: FreelancerSummaryDto | null = null;
  loading = true;
  error: string | null = null;
  generatedDate = new Date().toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });

  constructor(
    private route: ActivatedRoute,
    private feedbackService: FeedbackService
  ) {}

  ngOnInit(): void {
    const id   = this.route.snapshot.paramMap.get('id');
    const name = this.route.snapshot.queryParamMap.get('name') || '';
    if (!id) { this.error = 'Invalid verification link.'; this.loading = false; return; }

    this.freelancerId   = +id;
    this.freelancerName = name || 'Freelancer #' + id;

    this.feedbackService.getFreelancerSummary(this.freelancerId, { size: 100 }).subscribe({
      next:  (s) => { this.summary = s; this.loading = false; },
      error: ()  => { this.error = 'Could not load reputation data.'; this.loading = false; }
    });
  }

  get initials(): string {
    return this.freelancerName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  }

  get filledStars(): number[] {
    return Array(Math.round(this.summary?.avgGlobal ?? 0)).fill(0);
  }

  get emptyStars(): number[] {
    return Array(5 - Math.round(this.summary?.avgGlobal ?? 0)).fill(0);
  }

  get dimensions() {
    if (!this.summary) return [];
    return [
      { label: 'Communication',   value: this.summary.avgCommunication },
      { label: 'Quality',         value: this.summary.avgQuality },
      { label: 'Deadlines',       value: this.summary.avgDeadline },
      { label: 'Professionalism', value: this.summary.avgProfessionalism },
    ];
  }
}
