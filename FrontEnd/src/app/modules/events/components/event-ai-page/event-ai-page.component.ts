import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { EventService } from '../../../../core/services/event.service';
import { Event } from '../../../../core/models/event.model';
import { EventAiAssistantComponent } from '../event-ai-assistant/event-ai-assistant.component';

@Component({
  selector: 'app-event-ai-page',
  standalone: true,
  imports: [CommonModule, EventAiAssistantComponent],
  template: `
    <div class="ai-page">
      <div class="ai-page-header">
        <button class="btn-back" (click)="router.navigate(['/admin'])">← Retour</button>
        <div class="ai-page-title">
          <div class="ai-page-icon">🤖</div>
          <div>
            <h1>Centre d'Intelligence Artificielle</h1>
            <p>Gestion d'événements augmentée par Claude AI</p>
          </div>
        </div>
      </div>
      <div class="ai-page-body">
        <app-event-ai-assistant [events]="events"></app-event-ai-assistant>
      </div>
    </div>
  `,
  styles: [`
    .ai-page { min-height: 100vh; background: linear-gradient(135deg, #f0f4ff 0%, #faf5ff 100%); display: flex; flex-direction: column; }
    .ai-page-header { padding: 1.25rem 1.5rem; display: flex; align-items: center; gap: 1rem; background: rgba(255,255,255,.8); backdrop-filter: blur(8px); border-bottom: 1px solid #e2e8f0; }
    .btn-back { padding: .45rem .875rem; border: 1px solid #e2e8f0; background: #fff; border-radius: 8px; cursor: pointer; font-size: .8rem; color: #64748b; transition: all .2s; }
    .btn-back:hover { background: #f1f5f9; }
    .ai-page-title { display: flex; align-items: center; gap: .875rem; }
    .ai-page-icon { font-size: 2rem; }
    .ai-page-title h1 { font-size: 1.25rem; font-weight: 800; color: #1e293b; margin: 0; }
    .ai-page-title p { font-size: .8rem; color: #64748b; margin: 0; }
    .ai-page-body { flex: 1; padding: 1.5rem; display: flex; align-items: flex-start; justify-content: center; }
    app-event-ai-assistant { width: 100%; max-width: 680px; height: calc(100vh - 160px); }
  `]
})
export class EventAiPageComponent implements OnInit {
  events: Event[] = [];
  constructor(public router: Router, private eventService: EventService) {}
  ngOnInit(): void {
    this.eventService.getAllEvents().subscribe({ next: e => this.events = e, error: () => {} });
  }
}
