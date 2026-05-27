import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';        // ✅ IMPORTANT
import { FormsModule } from '@angular/forms';          // ✅ si tu utilises ngModel dans HTML
import { Router, RouterModule } from '@angular/router';

import { EventService } from '../../../../core/services/event.service';
import { Event, EventCategory } from '../../../../core/models/event.model';
import { MyEventsComponent } from '../my-events/my-events.component';

@Component({
  selector: 'app-event-public',
  standalone: true, // ✅ AJOUT
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MyEventsComponent
  ],
  templateUrl: './event-public.component.html',
  styleUrls: ['./event-public.component.css']
})
export class EventPublicComponent implements OnInit {

  events: Event[] = [];
  filteredEvents: Event[] = [];
  loading = false;
  error = '';
  searchTerm = '';
  selectedCategory = '';
  categories = Object.values(EventCategory);

  constructor(
    private eventService: EventService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadPublishedEvents();
  }

  loadPublishedEvents(): void {
    this.loading = true;
    this.eventService.getPublishedEvents().subscribe({
      next: (data) => {
        this.events = data;
        this.filteredEvents = data;
        this.loading = false;
      },
      error: () => {
        this.error = 'Erreur lors du chargement';
        this.loading = false;
      }
    });
  }

  filterEvents(): void {
    this.filteredEvents = this.events.filter(event => {
      const matchSearch = !this.searchTerm ||
        event.title.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        event.topic.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        event.location.toLowerCase().includes(this.searchTerm.toLowerCase());

      const matchCategory = !this.selectedCategory ||
        event.category === this.selectedCategory;

      return matchSearch && matchCategory;
    });
  }

  viewDetail(id: number): void {
    this.router.navigate(['/events', id]);
  }

  getAvailableSpots(event: Event): number {
    return event.capacity - event.totalRegistrations;
  }

  isFull(event: Event): boolean {
    return this.getAvailableSpots(event) <= 0;
  }
}