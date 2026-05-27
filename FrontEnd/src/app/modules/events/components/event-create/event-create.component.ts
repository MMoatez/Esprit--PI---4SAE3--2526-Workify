import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';              // ✅ IMPORTANT
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms'; // ✅ IMPORTANT
import { ActivatedRoute, Router } from '@angular/router';

import { EventService } from '../../../../core/services/event.service';
import { EventCategory } from '../../../../core/models/event.model';

@Component({
  selector: 'app-event-create',
  standalone: true, // ✅ AJOUT
  imports: [
    CommonModule,
    ReactiveFormsModule // ✅ pour FormGroup, formControlName...
  ],
  templateUrl: './event-create.component.html',
  styleUrls: ['./event-create.component.css']
})
export class EventCreateComponent implements OnInit {

  form: FormGroup;
  loading = false;
  error = '';
  isEditMode = false;
  eventId: number | null = null;
  geocoding = false;
  geocodeStatus = '';

  categories = Object.values(EventCategory);

  constructor(
    private fb: FormBuilder,
    private eventService: EventService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.form = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3)]],
      description: ['', Validators.required],
      eventDate: ['', Validators.required],
      location: ['', Validators.required],
      latitude: [null],
      longitude: [null],
      capacity: [null, [Validators.required, Validators.min(1)]],
      category: ['', Validators.required],
      topic: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.eventId = +this.route.snapshot.params['id'] || null;

    if (this.eventId) {
      this.isEditMode = true;
      this.loadEvent();
    } else {
      // Pre-fill from AI assistant if coming from "Utiliser pour créer l'événement →"
      const aiEvent = history.state?.aiEvent;
      if (aiEvent) {
        this.prefillFromAi(aiEvent);
      }
    }
  }

  private prefillFromAi(ai: any): void {
    let eventDate = '';
    if (ai.suggestedDate) {
      try {
        const d = new Date(ai.suggestedDate);
        if (!isNaN(d.getTime())) {
          // datetime-local input expects "YYYY-MM-DDTHH:mm"
          eventDate = d.toISOString().slice(0, 16);
        }
      } catch { /* ignore unparseable date */ }
    }

    this.form.patchValue({
      title:       ai.title       || '',
      description: ai.description || '',
      eventDate,
      location:    ai.location    || '',
      capacity:    ai.capacity    ?? null,
      category:    ai.category    || '',
      topic:       ai.topic       || '',
    });

    // Scroll to form top so the user sees the pre-filled fields
    setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 100);
  }

  loadEvent(): void {
    this.eventService.getEventById(this.eventId!).subscribe({
      next: (event) => {
        this.form.patchValue({
          title: event.title,
          description: event.description,
          eventDate: event.eventDate?.slice(0, 16),
          location: event.location,
          latitude: event.latitude,
          longitude: event.longitude,
          capacity: event.capacity,
          category: event.category,
          topic: event.topic
        });
        if (event.latitude) this.geocodeStatus = `📍 ${event.latitude.toFixed(5)}, ${event.longitude?.toFixed(5)}`;
      },
      error: () => this.error = 'Erreur lors du chargement'
    });
  }

  async geocodeLocation(): Promise<void> {
    const address = this.form.get('location')?.value?.trim();
    if (!address || address.length < 3) return;
    this.geocoding = true;
    this.geocodeStatus = '';
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`;
      const res = await fetch(url, { headers: { 'Accept-Language': 'fr' } });
      const data = await res.json();
      if (data?.length) {
        const lat = parseFloat(data[0].lat);
        const lng = parseFloat(data[0].lon);
        this.form.patchValue({ latitude: lat, longitude: lng });
        this.geocodeStatus = `✅ ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
      } else {
        this.geocodeStatus = '⚠️ Adresse non trouvée';
      }
    } catch {
      this.geocodeStatus = '⚠️ Erreur de géocodage';
    } finally {
      this.geocoding = false;
    }
  }

  submit(): void {
    if (this.form.invalid) return;

    this.loading = true;
    const request = this.form.value;

    const action = this.isEditMode
      ? this.eventService.updateEvent(this.eventId!, request)
      : this.eventService.createEvent(request);

    action.subscribe({
      next: () => {
        this.loading = false;
        this.router.navigate(['/events/admin/list']);
      },
      error: () => {
        this.error = 'Erreur lors de la sauvegarde';
        this.loading = false;
      }
    });
  }

  cancel(): void {
    this.router.navigate(['/events/admin/list']);
  }
}