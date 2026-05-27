import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { EventService } from '../../../../core/services/event.service';
import { AuthService } from '../../../../core/services/auth.service';
import { EventRegistration, RegistrationStatus } from '../../../../core/models/event.model';

@Component({
  selector: 'app-my-events',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="my-events-section" *ngIf="isLoggedIn">

      <!-- Header -->
      <div class="section-header">
        <div class="section-title-group">
          <span class="section-icon">🎟️</span>
          <div>
            <h2 class="section-title">Mes événements</h2>
            <p class="section-sub">Tous vos événements inscrits</p>
          </div>
        </div>
        <span class="count-badge" *ngIf="registrations.length">{{ registrations.length }}</span>
      </div>

      <!-- Loading skeletons -->
      <div class="skeleton-row" *ngIf="loading">
        <div class="skeleton-card" *ngFor="let i of [1,2,3]"></div>
      </div>

      <!-- Empty state -->
      <div class="empty-state" *ngIf="!loading && registrations.length === 0">
        <div class="empty-icon">📭</div>
        <p class="empty-title">Aucune inscription pour le moment</p>
        <p class="empty-sub">Inscrivez-vous à un événement ci-dessous pour le retrouver ici.</p>
      </div>

      <!-- Cards -->
      <div class="my-events-grid" *ngIf="!loading && registrations.length > 0">
        <div class="my-event-card" *ngFor="let reg of registrations"
             (click)="goToEvent(reg.eventId!)">

          <!-- Status ribbon -->
          <div class="status-ribbon" [ngClass]="statusClass(reg.status)">
            <span class="status-dot"></span>
            {{ statusLabel(reg.status) }}
          </div>

          <!-- Card body -->
          <div class="card-body">
            <h3 class="event-name">{{ reg.eventTitle }}</h3>

            <div class="meta-list">
              <div class="meta-item">
                <span class="meta-icon">📅</span>
                <span>{{ formatDate(reg.eventDate) }}</span>
              </div>
              <div class="meta-item">
                <span class="meta-icon">📍</span>
                <span>{{ reg.eventLocation }}</span>
              </div>
              <div class="meta-item">
                <span class="meta-icon">🎯</span>
                <span>{{ reg.userType }}</span>
              </div>
              <div class="meta-item">
                <span class="meta-icon">🗓️</span>
                <span>Inscrit le {{ reg.registeredAt | date:'dd/MM/yyyy' }}</span>
              </div>
            </div>
          </div>

          <!-- Footer actions -->
          <div class="card-footer">
            <button class="btn-detail" (click)="goToEvent(reg.eventId!); $event.stopPropagation()">
              Voir détails →
            </button>
            <button class="btn-ticket"
              *ngIf="reg.status === RegistrationStatus.CONFIRMED"
              (click)="goToTicket(reg.eventId!); $event.stopPropagation()">
              🎫 Mon ticket
            </button>
          </div>

          <!-- Attended badge -->
          <div class="attended-badge" *ngIf="reg.status === RegistrationStatus.ATTENDED">
            ✅ Participé
          </div>
        </div>
      </div>

    </div>
  `,
  styles: [`
    .my-events-section {
      margin-bottom: 40px;
    }

    /* Header */
    .section-header {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 20px;
    }
    .section-title-group { display: flex; align-items: center; gap: 14px; }
    .section-icon { font-size: 28px; }
    .section-title { font-size: 22px; font-weight: 800; color: #1e293b; margin: 0; }
    .section-sub { font-size: 13px; color: #94a3b8; margin: 2px 0 0; }
    .count-badge {
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      color: #fff; font-size: 14px; font-weight: 700;
      padding: 4px 12px; border-radius: 999px;
    }

    /* Skeleton */
    .skeleton-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
    @media(max-width: 900px) { .skeleton-row { grid-template-columns: repeat(2,1fr); } }
    @media(max-width: 600px) { .skeleton-row { grid-template-columns: 1fr; } }
    .skeleton-card {
      height: 180px; background: #f1f5f9; border-radius: 16px;
      animation: shimmer 1.4s ease-in-out infinite;
    }
    @keyframes shimmer { 0%,100%{ opacity:1 } 50%{ opacity:.5 } }

    /* Empty */
    .empty-state {
      background: #f8fafc; border: 2px dashed #e2e8f0;
      border-radius: 16px; padding: 40px 20px; text-align: center;
    }
    .empty-icon { font-size: 40px; margin-bottom: 12px; }
    .empty-title { font-size: 16px; font-weight: 700; color: #475569; margin: 0 0 6px; }
    .empty-sub { font-size: 13px; color: #94a3b8; margin: 0; }

    /* Grid */
    .my-events-grid {
      display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;
    }
    @media(max-width: 900px) { .my-events-grid { grid-template-columns: repeat(2,1fr); } }
    @media(max-width: 600px) { .my-events-grid { grid-template-columns: 1fr; } }

    /* Card */
    .my-event-card {
      position: relative; background: #fff;
      border: 1px solid #e2e8f0; border-radius: 18px;
      overflow: hidden; cursor: pointer;
      transition: transform .2s, box-shadow .2s;
      display: flex; flex-direction: column;
    }
    .my-event-card:hover {
      transform: translateY(-3px);
      box-shadow: 0 12px 32px rgba(99,102,241,.12);
      border-color: #c7d2fe;
    }

    /* Status ribbon */
    .status-ribbon {
      display: flex; align-items: center; gap: 7px;
      padding: 8px 16px; font-size: 12px; font-weight: 700;
      letter-spacing: .03em;
    }
    .status-dot {
      width: 8px; height: 8px; border-radius: 50%;
      background: currentColor; opacity: .7;
    }
    .status-pending  { background: #fef3c7; color: #b45309; }
    .status-confirmed { background: #d1fae5; color: #065f46; }
    .status-attended { background: #dbeafe; color: #1e40af; }
    .status-cancelled { background: #fee2e2; color: #991b1b; }

    /* Card body */
    .card-body { padding: 14px 18px; flex: 1; }
    .event-name {
      font-size: 15px; font-weight: 800; color: #1e293b;
      margin: 0 0 12px; line-height: 1.3;
    }
    .meta-list { display: flex; flex-direction: column; gap: 6px; }
    .meta-item { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #64748b; }
    .meta-icon { font-size: 14px; flex-shrink: 0; }

    /* Footer */
    .card-footer {
      padding: 12px 18px; border-top: 1px solid #f1f5f9;
      display: flex; gap: 8px;
    }
    .btn-detail {
      flex: 1; padding: 8px 0; background: #f1f5f9; color: #475569;
      border: none; border-radius: 9px; font-size: 13px; font-weight: 600;
      cursor: pointer; transition: background .2s;
    }
    .btn-detail:hover { background: #e2e8f0; }
    .btn-ticket {
      flex: 1; padding: 8px 0;
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      color: #fff; border: none; border-radius: 9px;
      font-size: 13px; font-weight: 700; cursor: pointer;
      transition: opacity .2s;
    }
    .btn-ticket:hover { opacity: .9; }

    /* Attended badge */
    .attended-badge {
      position: absolute; top: 10px; right: 12px;
      background: #dbeafe; color: #1e40af;
      font-size: 11px; font-weight: 700;
      padding: 3px 10px; border-radius: 999px;
    }
  `]
})
export class MyEventsComponent implements OnInit {

  registrations: EventRegistration[] = [];
  loading = false;
  isLoggedIn = false;
  RegistrationStatus = RegistrationStatus;

  constructor(
    private eventService: EventService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.isLoggedIn = this.authService.isLoggedIn();
    if (this.isLoggedIn) this.load();
  }

  load(): void {
    this.loading = true;
    this.eventService.getMyRegistrations().subscribe({
      next: data => { this.registrations = data; this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  statusLabel(status: RegistrationStatus): string {
    const map: Record<string, string> = {
      PENDING:   'En attente',
      CONFIRMED: 'Confirmé',
      ATTENDED:  'Participé',
      CANCELLED: 'Annulé'
    };
    return map[status] || status;
  }

  statusClass(status: RegistrationStatus): string {
    const map: Record<string, string> = {
      PENDING:   'status-pending',
      CONFIRMED: 'status-confirmed',
      ATTENDED:  'status-attended',
      CANCELLED: 'status-cancelled'
    };
    return map[status] || '';
  }

  formatDate(dateStr?: string): string {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  goToEvent(id: number): void { this.router.navigate(['/events', id]); }
  goToTicket(id: number): void { this.router.navigate(['/events', id, 'ticket']); }
}
