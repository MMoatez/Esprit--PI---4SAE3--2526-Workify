import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { EventService } from '../../../../core/services/event.service';
import { EventRegistration, RegistrationStatus } from '../../../../core/models/event.model';

@Component({
  selector: 'app-admin-event-registrations',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-event-registrations.component.html',
  styleUrls: ['./admin-event-registrations.component.css']
})
export class AdminEventRegistrationsComponent implements OnInit {
  registrations: EventRegistration[] = [];
  loading = false;
  error = '';
  successMsg = '';
  eventId!: number;
  RegistrationStatus = RegistrationStatus;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private eventService: EventService
  ) {}

  ngOnInit(): void {
    this.eventId = +this.route.snapshot.params['id'];
    this.loadRegistrations();
  }

  loadRegistrations(): void {
    this.loading = true;
    this.error = '';
    this.eventService.getEventRegistrations(this.eventId).subscribe({
      next: (data) => { this.registrations = data; this.loading = false; },
      error: () => { this.error = 'Erreur de chargement'; this.loading = false; }
    });
  }

  acceptRegistration(id: number): void {
    this.eventService.updateRegistrationStatus(this.eventId, id, RegistrationStatus.CONFIRMED).subscribe({
      next: () => { this.flash('✅ Inscription confirmée'); this.loadRegistrations(); },
      error: () => this.error = 'Erreur'
    });
  }

  rejectRegistration(id: number): void {
    this.eventService.updateRegistrationStatus(this.eventId, id, RegistrationStatus.CANCELLED).subscribe({
      next: () => { this.flash('❌ Inscription refusée'); this.loadRegistrations(); },
      error: () => this.error = 'Erreur'
    });
  }

  markAttended(id: number): void {
    this.eventService.markAttended(this.eventId, id).subscribe({
      next: () => { this.flash('🎉 Présence enregistrée'); this.loadRegistrations(); },
      error: () => this.error = 'Erreur'
    });
  }

  flash(msg: string): void {
    this.successMsg = msg;
    setTimeout(() => this.successMsg = '', 3000);
  }

  get pendingCount(): number { return this.registrations.filter(r => r.status === RegistrationStatus.PENDING).length; }
  get confirmedCount(): number { return this.registrations.filter(r => r.status === RegistrationStatus.CONFIRMED).length; }
  get attendedCount(): number { return this.registrations.filter(r => r.status === RegistrationStatus.ATTENDED).length; }
  get cancelledCount(): number { return this.registrations.filter(r => r.status === RegistrationStatus.CANCELLED).length; }

  getStatusClass(status: RegistrationStatus): string {
    const map: Record<string, string> = {
      PENDING: 'badge-pending', CONFIRMED: 'badge-confirmed',
      ATTENDED: 'badge-attended', CANCELLED: 'badge-cancelled'
    };
    return map[status] || '';
  }

  getStatusLabel(status: RegistrationStatus): string {
    const map: Record<string, string> = {
      PENDING: '⏳ En attente', CONFIRMED: '✅ Confirmé',
      ATTENDED: '🎉 Présent', CANCELLED: '❌ Refusé'
    };
    return map[status] || status;
  }

  goBack(): void { this.router.navigate(['/events/admin/list']); }
}
