import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { EventMapComponent } from '../event-map/event-map.component';
import { RegistrationQuizComponent } from '../registration-quiz/registration-quiz.component';

import { EventService } from '../../../../core/services/event.service';
import { AuthService } from '../../../../core/services/auth.service';
import {
  Event, EventStats, EventStatus,
  EventRegistration, RegisterEventRequest, UserType, RegistrationStatus
} from '../../../../core/models/event.model';

@Component({
  selector: 'app-event-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, EventMapComponent, RegistrationQuizComponent],
  templateUrl: './event-detail.component.html',
  styleUrls: ['./event-detail.component.css']
})
export class EventDetailComponent implements OnInit {

  event!: Event;
  stats!: EventStats;
  loading = false;
  error = '';
  registering = false;
  myRegistration: EventRegistration | null = null;
  isAdmin = false;
  EventStatus = EventStatus;
  UserType = UserType;
  RegistrationStatus = RegistrationStatus;
  selectedUserType = UserType.FREELANCER;
  showQuiz = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private eventService: EventService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    const id = +this.route.snapshot.params['id'];
    this.isAdmin = this.authService.getRole() === 'ADMIN';
    this.loadEvent(id);
    this.loadStats(id);
    if (!this.isAdmin) {
      this.loadMyRegistration(id);
    }
  }

  loadEvent(id: number): void {
    this.loading = true;
    this.eventService.getEventById(id).subscribe({
      next: (data) => { this.event = data; this.loading = false; },
      error: () => { this.error = 'Événement introuvable'; this.loading = false; }
    });
  }

  loadStats(id: number): void {
    this.eventService.getEventStats(id).subscribe({
      next: (data) => this.stats = data,
      error: () => {}
    });
  }

  loadMyRegistration(id: number): void {
    this.eventService.getMyRegistration(id).subscribe({
      next: (data) => this.myRegistration = data,
      error: () => this.myRegistration = null
    });
  }

  openQuiz(): void {
    this.showQuiz = true;
  }

  onQuizPassed(): void {
    this.showQuiz = false;
    this.register();
  }

  onQuizCancelled(): void {
    this.showQuiz = false;
  }

  register(): void {
    if (!this.event) return;
    this.registering = true;
    const request: RegisterEventRequest = { userType: this.selectedUserType };
    this.eventService.registerToEvent(this.event.id, request).subscribe({
      next: (reg) => {
        this.myRegistration = reg;
        this.registering = false;
        this.loadStats(this.event.id);
      },
      error: (err) => {
        this.error = err.error?.message || 'Erreur lors de l\'inscription';
        this.registering = false;
      }
    });
  }

  cancelRegistration(): void {
    if (!this.event) return;
    this.eventService.cancelRegistration(this.event.id).subscribe({
      next: () => { this.myRegistration = null; this.loadStats(this.event.id); },
      error: () => this.error = 'Erreur lors de l\'annulation'
    });
  }

  downloadIcal(): void {
    this.eventService.downloadIcal(this.event.id);
  }

  goToTicket(): void {
    this.router.navigate(['/events', this.event.id, 'ticket']);
  }

  goBack(): void {
    this.router.navigate(['/events']);
  }

  getStatusClass(status: EventStatus): string {
    const map: Record<string, string> = {
      DRAFT: 'badge-draft', PENDING_PARTNERS: 'badge-pending',
      ENRICHED: 'badge-enriched', PUBLISHED: 'badge-published', ARCHIVED: 'badge-archived'
    };
    return map[status] || '';
  }
}
