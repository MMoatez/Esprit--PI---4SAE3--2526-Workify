import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { EventService } from '../../../../core/services/event.service';
import { Event, EventStatus } from '../../../../core/models/event.model';

type ViewMode = 'month' | 'week' | 'day' | 'agenda';

interface CalCell {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  events: Event[];
}


@Component({
  selector: 'app-event-calendar',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './event-calendar.component.html',
  styleUrls: ['./event-calendar.component.css']
})
export class EventCalendarComponent implements OnInit {

  events: Event[] = [];
  cells: CalCell[] = [];
  currentDate = new Date();
  loading = false;
  viewMode: ViewMode = 'month';
  selectedEvent: Event | null = null;
  panelOpen = false;
  searchQuery = '';
  filterStatus = '';

  readonly weekDays = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
  readonly months = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
  readonly hours = Array.from({length: 24}, (_, i) => i);

  readonly catColors: Record<string, string> = {
    TECHNOLOGY: '#6366f1', DESIGN: '#ec4899', MARKETING: '#f59e0b',
    FINANCE: '#10b981', ENTREPRENEURSHIP: '#8b5cf6', DATA_SCIENCE: '#06b6d4',
    CYBERSECURITY: '#ef4444', WEB_DEVELOPMENT: '#3b82f6',
    MOBILE_DEVELOPMENT: '#f97316', OTHER: '#64748b'
  };

  readonly statusConfig: Record<string, { label: string; color: string; bg: string }> = {
    DRAFT:            { label: 'Brouillon',   color: '#64748b', bg: '#f1f5f9' },
    PENDING_PARTNERS: { label: 'En attente',  color: '#d97706', bg: '#fffbeb' },
    ENRICHED:         { label: 'Enrichi',     color: '#0891b2', bg: '#ecfeff' },
    PUBLISHED:        { label: 'Publié',      color: '#16a34a', bg: '#f0fdf4' },
    ARCHIVED:         { label: 'Archivé',     color: '#9ca3af', bg: '#f9fafb' },
  };

  constructor(private eventService: EventService, private router: Router) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    this.eventService.getAllEvents().subscribe({
      next: d => { this.events = d; this.build(); this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  // ===========================
  // CALENDAR BUILD
  // ===========================

  build(): void {
    const y = this.currentDate.getFullYear();
    const m = this.currentDate.getMonth();
    const first = new Date(y, m, 1);
    const last = new Date(y, m + 1, 0);
    let dow = first.getDay();
    dow = dow === 0 ? 6 : dow - 1;
    const today = new Date();
    const cells: CalCell[] = [];

    for (let i = dow - 1; i >= 0; i--) {
      const date = new Date(y, m, -i);
      cells.push({ date, isCurrentMonth: false, isToday: false, events: this.eventsFor(date) });
    }
    for (let d = 1; d <= last.getDate(); d++) {
      const date = new Date(y, m, d);
      cells.push({ date, isCurrentMonth: true, isToday: this.same(date, today), events: this.eventsFor(date) });
    }
    const rem = 42 - cells.length;
    for (let d = 1; d <= rem; d++) {
      const date = new Date(y, m + 1, d);
      cells.push({ date, isCurrentMonth: false, isToday: false, events: this.eventsFor(date) });
    }
    this.cells = cells;
  }

  eventsFor(d: Date): Event[] {
    return this.filteredEvents.filter(e => this.same(new Date(e.eventDate), d));
  }

  same(a: Date, b: Date): boolean {
    return a.getFullYear() === b.getFullYear() &&
           a.getMonth() === b.getMonth() &&
           a.getDate() === b.getDate();
  }

  // ===========================
  // WEEK VIEW
  // ===========================

  get weekDates(): Date[] {
    const d = new Date(this.currentDate);
    const day = d.getDay() === 0 ? 6 : d.getDay() - 1;
    d.setDate(d.getDate() - day);
    return Array.from({ length: 7 }, (_, i) => {
      const dt = new Date(d); dt.setDate(d.getDate() + i); return dt;
    });
  }

  eventsForWeekDay(date: Date, hour: number): Event[] {
    return this.filteredEvents.filter(e => {
      const ed = new Date(e.eventDate);
      return this.same(ed, date) && ed.getHours() === hour;
    });
  }

  // ===========================
  // DAY VIEW
  // ===========================

  eventsForDayHour(hour: number): Event[] {
    return this.filteredEvents.filter(e => {
      const ed = new Date(e.eventDate);
      return this.same(ed, this.currentDate) && ed.getHours() === hour;
    });
  }

  get dayEvents(): Event[] {
    return this.filteredEvents.filter(e => this.same(new Date(e.eventDate), this.currentDate))
      .sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime());
  }

  // ===========================
  // AGENDA VIEW
  // ===========================

  get agendaGroups(): { label: string; date: Date; events: Event[] }[] {
    const sorted = [...this.filteredEvents].sort((a, b) =>
      new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime()
    );
    const groups: { label: string; date: Date; events: Event[] }[] = [];
    for (const ev of sorted) {
      const d = new Date(ev.eventDate);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      let g = groups.find(x => `${x.date.getFullYear()}-${x.date.getMonth()}-${x.date.getDate()}` === key);
      if (!g) {
        const label = this.same(d, new Date()) ? 'Aujourd\'hui' :
          this.same(d, new Date(Date.now() + 86400000)) ? 'Demain' :
          `${this.weekDays[(d.getDay() + 6) % 7]} ${d.getDate()} ${this.months[d.getMonth()]}`;
        g = { label, date: d, events: [] };
        groups.push(g);
      }
      g.events.push(ev);
    }
    return groups;
  }

  // ===========================
  // FILTERS
  // ===========================

  get filteredEvents(): Event[] {
    let evs = this.events;
    if (this.filterStatus) evs = evs.filter(e => e.status === this.filterStatus);
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      evs = evs.filter(e => e.title.toLowerCase().includes(q) || e.location?.toLowerCase().includes(q));
    }
    return evs;
  }

  // ===========================
  // STATS
  // ===========================

  get statsThisMonth(): number {
    const y = this.currentDate.getFullYear(), m = this.currentDate.getMonth();
    return this.events.filter(e => { const d = new Date(e.eventDate); return d.getFullYear()===y && d.getMonth()===m; }).length;
  }

  get statsUpcoming(): number {
    return this.events.filter(e => new Date(e.eventDate) >= new Date() && e.status === EventStatus.PUBLISHED).length;
  }

  get statsDraft(): number {
    return this.events.filter(e => e.status === EventStatus.DRAFT).length;
  }

  get statsToday(): number {
    return this.events.filter(e => this.same(new Date(e.eventDate), new Date())).length;
  }

  // ===========================
  // NAVIGATION
  // ===========================

  prev(): void {
    if (this.viewMode === 'month') {
      this.currentDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() - 1, 1);
      this.build();
    } else if (this.viewMode === 'week') {
      this.currentDate = new Date(this.currentDate.getTime() - 7 * 86400000);
    } else {
      this.currentDate = new Date(this.currentDate.getTime() - 86400000);
    }
  }

  next(): void {
    if (this.viewMode === 'month') {
      this.currentDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1, 1);
      this.build();
    } else if (this.viewMode === 'week') {
      this.currentDate = new Date(this.currentDate.getTime() + 7 * 86400000);
    } else {
      this.currentDate = new Date(this.currentDate.getTime() + 86400000);
    }
  }

  toToday(): void { this.currentDate = new Date(); this.build(); }

  setView(v: ViewMode): void { this.viewMode = v; if (v === 'month') this.build(); }

  // ===========================
  // LABELS
  // ===========================

  get navLabel(): string {
    if (this.viewMode === 'month') return `${this.months[this.currentDate.getMonth()]} ${this.currentDate.getFullYear()}`;
    if (this.viewMode === 'week') {
      const wd = this.weekDates;
      return `${wd[0].getDate()} – ${wd[6].getDate()} ${this.months[wd[6].getMonth()]} ${wd[6].getFullYear()}`;
    }
    return `${this.weekDays[(this.currentDate.getDay() + 6) % 7]} ${this.currentDate.getDate()} ${this.months[this.currentDate.getMonth()]} ${this.currentDate.getFullYear()}`;
  }

  isWeekToday(d: Date): boolean { return this.same(d, new Date()); }

  // ===========================
  // PANEL
  // ===========================

  openPanel(e: Event, evt?: MouseEvent): void {
    if (evt) evt.stopPropagation();
    this.selectedEvent = e;
    this.panelOpen = true;
  }

  closePanel(): void { this.panelOpen = false; setTimeout(() => this.selectedEvent = null, 300); }

  goToEvent(id: number): void { this.router.navigate(['/events', id]); }
  goCreate(): void { this.router.navigate(['/events/admin/create']); }
  goBack(): void { this.router.navigate(['/admin']); }

  countByStatus(status: string): number {
    return this.events.filter(e => e.status === status).length;
  }

  color(cat: string): string { return this.catColors[cat] || '#64748b'; }
  statusLabel(s: string): string { return this.statusConfig[s]?.label || s; }
  statusColor(s: string): string { return this.statusConfig[s]?.color || '#64748b'; }
  statusBg(s: string): string { return this.statusConfig[s]?.bg || '#f1f5f9'; }

  fillRate(e: Event): number {
    if (!e.capacity || e.capacity === 0) return 0;
    return Math.min(100, Math.round((e.totalRegistrations / e.capacity) * 100));
  }

  downloadIcal(e: Event, evt: MouseEvent): void {
    evt.stopPropagation();
    this.eventService.downloadIcal(e.id);
  }
}
