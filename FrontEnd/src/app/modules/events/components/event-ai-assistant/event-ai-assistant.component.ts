import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { EventService } from '../../../../core/services/event.service';
import { Event, EventCategory } from '../../../../core/models/event.model';

type AiTab = 'create' | 'predict' | 'insights' | 'partners' | 'email' | 'schedule';

@Component({
  selector: 'app-event-ai-assistant',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './event-ai-assistant.component.html',
  styleUrls: ['./event-ai-assistant.component.css']
})
export class EventAiAssistantComponent implements OnInit {

  @Input() events: Event[] = [];
  @Output() useGeneratedEvent = new EventEmitter<any>();

  activeTab: AiTab = 'create';
  loading = false;
  error = '';

  // --- Create ---
  createPrompt = '';
  generatedEvent: any = null;

  // --- Predict / Insights / Partners / Email ---
  selectedEventId: number | null = null;
  predictionResult: any = null;
  insightsResult: any = null;
  partnersResult: any = null;
  emailResult: any = null;
  emailRecipient = 'participant';

  // --- Schedule ---
  scheduleEventType = '';
  scheduleCategory = EventCategory.TECHNOLOGY;
  scheduleResult: any = null;
  categories = Object.values(EventCategory);

  constructor(private eventService: EventService, private router: Router) {}

  ngOnInit(): void {}

  // ===========================
  // TABS
  // ===========================
  setTab(t: AiTab): void {
    this.activeTab = t;
    this.error = '';
  }

  // ===========================
  // 1. GENERATE EVENT
  // ===========================
  generateEvent(): void {
    if (!this.createPrompt.trim()) return;
    this.loading = true; this.generatedEvent = null; this.error = '';
    this.eventService.aiGenerateEvent(this.createPrompt).subscribe({
      next: r => { this.generatedEvent = r; this.loading = false; },
      error: e => { this.error = e?.error?.message || 'Erreur IA'; this.loading = false; }
    });
  }

  applyGenerated(): void {
    this.useGeneratedEvent.emit(this.generatedEvent);
    this.router.navigate(['/events/admin/create'], { state: { aiEvent: this.generatedEvent } });
  }

  // ===========================
  // 2. PREDICT ATTENDANCE
  // ===========================
  predictAttendance(): void {
    if (!this.selectedEventId) return;
    this.loading = true; this.predictionResult = null; this.error = '';
    this.eventService.aiPredictAttendance(this.selectedEventId).subscribe({
      next: r => { this.predictionResult = r; this.loading = false; },
      error: e => { this.error = e?.error?.message || 'Erreur IA'; this.loading = false; }
    });
  }

  // ===========================
  // 3. POST-EVENT INSIGHTS
  // ===========================
  getInsights(): void {
    if (!this.selectedEventId) return;
    this.loading = true; this.insightsResult = null; this.error = '';
    this.eventService.aiGetInsights(this.selectedEventId).subscribe({
      next: r => { this.insightsResult = r; this.loading = false; },
      error: e => { this.error = e?.error?.message || 'Erreur IA'; this.loading = false; }
    });
  }

  // ===========================
  // 4. RECOMMEND PARTNERS
  // ===========================
  recommendPartners(): void {
    if (!this.selectedEventId) return;
    this.loading = true; this.partnersResult = null; this.error = '';
    this.eventService.aiRecommendPartners(this.selectedEventId).subscribe({
      next: r => { this.partnersResult = r; this.loading = false; },
      error: e => { this.error = e?.error?.message || 'Erreur IA'; this.loading = false; }
    });
  }

  // ===========================
  // 5. GENERATE EMAIL
  // ===========================
  generateEmail(): void {
    if (!this.selectedEventId) return;
    this.loading = true; this.emailResult = null; this.error = '';
    this.eventService.aiGenerateEmail(this.selectedEventId, this.emailRecipient).subscribe({
      next: r => { this.emailResult = r; this.loading = false; },
      error: e => { this.error = e?.error?.message || 'Erreur IA'; this.loading = false; }
    });
  }

  copyEmail(): void {
    if (this.emailResult?.body) {
      const text = this.emailResult.body.replace(/<[^>]*>/g, '');
      navigator.clipboard.writeText(`Objet: ${this.emailResult.subject}\n\n${text}`);
    }
  }

  // ===========================
  // 6. SMART SCHEDULE
  // ===========================
  suggestSchedule(): void {
    if (!this.scheduleEventType.trim()) return;
    this.loading = true; this.scheduleResult = null; this.error = '';
    this.eventService.aiSuggestSchedule(this.scheduleEventType, this.scheduleCategory).subscribe({
      next: r => { this.scheduleResult = r; this.loading = false; },
      error: e => { this.error = e?.error?.message || 'Erreur IA'; this.loading = false; }
    });
  }

  // ===========================
  // UTILS
  // ===========================
  riskClass(risk: string): string {
    return { LOW: 'risk-low', MEDIUM: 'risk-med', HIGH: 'risk-high' }[risk] || '';
  }
  trendIcon(t: string): string {
    return { UP: '↑', DOWN: '↓', STABLE: '→' }[t] || '→';
  }
  trendClass(t: string): string {
    return { UP: 'trend-up', DOWN: 'trend-down', STABLE: 'trend-stable' }[t] || '';
  }
  scoreColor(n: number): string {
    if (n >= 75) return '#16a34a';
    if (n >= 50) return '#d97706';
    return '#dc2626';
  }
  formatDate(dt: string): string {
    if (!dt) return '';
    try { return new Date(dt).toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit' }); }
    catch { return dt; }
  }
}
