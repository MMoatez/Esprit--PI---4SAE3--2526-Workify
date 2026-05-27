import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common'; // ✅ IMPORTANT
import { Router } from '@angular/router';

import { Event, EventStatus } from '../../../../core/models/event.model';
import { EventService } from '../../../../core/services/event.service';

@Component({
  selector: 'app-event-list',
  standalone: true, // ✅ AJOUT
  imports: [
    CommonModule // ✅ pour *ngFor, *ngIf
  ],
  templateUrl: './event-list.component.html',
  styleUrls: ['./event-list.component.css']
})
export class EventListComponent implements OnInit {

  events: Event[] = [];
  loading = false;
  error = '';
  EventStatus = EventStatus;

  constructor(
    private eventService: EventService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadEvents();
  }

  loadEvents(): void {
    this.loading = true;
    this.eventService.getAllEvents().subscribe({
      next: (data) => {
        this.events = data;
        this.loading = false;
      },
      error: () => {
        this.error = 'Erreur lors du chargement des événements';
        this.loading = false;
      }
    });
  }

  createEvent(): void {
    this.router.navigate(['/events/admin/create']);
  }

  editEvent(id: number): void {
    this.router.navigate(['/events/admin/edit', id]);
  }

  managePartners(id: number): void {
    this.router.navigate(['/events/admin/partners', id]);
  }

  manageRegistrations(id: number): void {
    this.router.navigate(['/events/admin/registrations', id]);
  }

  manageValidator(): void {
    this.router.navigate(['/events/admin/validator']);
  }

  viewDetail(id: number): void {
    this.router.navigate(['/events', id]);
  }

  updateStatus(id: number, status: EventStatus): void {
    this.eventService.updateStatus(id, status).subscribe({
      next: () => this.loadEvents(),
      error: () => this.error = 'Erreur lors de la mise à jour du statut'
    });
  }

  deleteEvent(id: number): void {
    if (confirm('Voulez-vous vraiment supprimer cet événement ?')) {
      this.eventService.deleteEvent(id).subscribe({
        next: () => this.loadEvents(),
        error: () => this.error = 'Erreur lors de la suppression'
      });
    }
  }

  getStatusClass(status: EventStatus): string {
    switch (status) {
      case EventStatus.DRAFT: return 'badge-draft';
      case EventStatus.PENDING_PARTNERS: return 'badge-pending';
      case EventStatus.ENRICHED: return 'badge-enriched';
      case EventStatus.PUBLISHED: return 'badge-published';
      case EventStatus.ARCHIVED: return 'badge-archived';
      default: return '';
    }
  }
}