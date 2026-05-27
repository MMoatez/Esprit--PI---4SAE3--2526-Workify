import { Component, OnInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { EventService } from '../../../../core/services/event.service';
import { Event, EventRegistration, RegistrationStatus } from '../../../../core/models/event.model';
import { EventMapComponent } from '../event-map/event-map.component';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

@Component({
  selector: 'app-event-ticket',
  standalone: true,
  imports: [CommonModule, EventMapComponent],
  templateUrl: './event-ticket.component.html',
  styleUrls: ['./event-ticket.component.css']
})
export class EventTicketComponent implements OnInit {
  @ViewChild('ticketEl') ticketRef!: ElementRef<HTMLElement>;

  event!: Event;
  registration!: EventRegistration;
  qrUrl: SafeUrl | null = null;
  loading = true;
  downloading = false;
  error = '';
  RegistrationStatus = RegistrationStatus;
  private eventLoaded = false;
  private regLoaded = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private eventService: EventService,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    const id = +this.route.snapshot.params['id'];
    this.eventService.getEventById(id).subscribe({
      next: e => { this.event = e; this.eventLoaded = true; this.checkReady(); },
      error: () => { this.error = 'Événement introuvable'; this.loading = false; }
    });
    this.eventService.getMyRegistration(id).subscribe({
      next: reg => {
        this.registration = reg;
        this.regLoaded = true;
        this.checkReady();
        this.eventService.getTicketQrCode(id, reg.id).subscribe({
          next: blob => { this.qrUrl = this.sanitizer.bypassSecurityTrustUrl(URL.createObjectURL(blob)); },
          error: () => {}
        });
      },
      error: () => { this.error = 'Inscription introuvable'; this.loading = false; }
    });
  }

  checkReady(): void { if (this.eventLoaded && this.regLoaded) this.loading = false; }

  get ticketId(): string {
    if (!this.event || !this.registration) return '';
    return `WKF-${String(this.event.id).padStart(4,'0')}-${String(this.registration.id).padStart(6,'0')}`;
  }

  downloadIcal(): void { this.eventService.downloadIcal(this.event.id); }
  print(): void { window.print(); }
  goBack(): void { this.router.navigate(['/events', this.event?.id]); }

  async downloadPdf(): Promise<void> {
    if (!this.ticketRef?.nativeElement) return;
    this.downloading = true;
    try {
      const canvas = await html2canvas(this.ticketRef.nativeElement, {
        scale: 2, useCORS: true, backgroundColor: '#ffffff'
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a5' });
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = (canvas.height * pdfW) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfW, pdfH);
      pdf.save(`ticket-${this.ticketId}.pdf`);
    } finally {
      this.downloading = false;
    }
  }
}
