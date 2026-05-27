import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { EventService } from '../../../../core/services/event.service';
import {
  Event, EventPartner, InvitePartnerRequest,
  PartnerSummary, PartnerStatus
} from '../../../../core/models/event.model';

@Component({
  selector: 'app-event-partners',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './event-partners.component.html',
  styleUrls: ['./event-partners.component.css'],
  providers: [DatePipe]
})
export class EventPartnersComponent implements OnInit {

  event!: Event;
  partners: EventPartner[] = [];
  availablePartners: PartnerSummary[] = [];
  filteredPartners: PartnerSummary[] = [];

  loading = false;
  loadingAvailable = false;
  error = '';
  success = '';
  showInviteForm = false;
  showDropdown = false;
  searchQuery = '';
  selectedPartner: PartnerSummary | null = null;

  PartnerStatus = PartnerStatus;

  inviteForm: InvitePartnerRequest = {
    partnerId: '',
    partnerEmail: '',
    partnerName: ''
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private eventService: EventService
  ) {}

  ngOnInit(): void {
    const id = +this.route.snapshot.params['id'];
    this.loadEvent(id);
    this.loadPartners(id);
  }

  // Close dropdown when clicking outside
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.partner-search-wrapper')) {
      this.showDropdown = false;
    }
  }

  loadEvent(id: number): void {
    this.eventService.getEventById(id).subscribe({
      next: (data) => this.event = data,
      error: () => this.error = 'Événement introuvable'
    });
  }

  loadPartners(id: number): void {
    this.loading = true;
    this.eventService.getEventPartners(id).subscribe({
      next: (data) => {
        this.partners = data;
        this.loading = false;
      },
      error: () => {
        this.error = 'Erreur lors du chargement des partenaires';
        this.loading = false;
      }
    });
  }

  openInviteForm(): void {
    this.showInviteForm = true;
    this.error = '';
    this.success = '';
    this.loadAvailablePartners();
  }

  loadAvailablePartners(): void {
    if (!this.event) return;
    this.loadingAvailable = true;
    this.eventService.getAvailablePartners(this.event.id).subscribe({
      next: (data) => {
        this.availablePartners = data;
        this.filteredPartners = data;
        this.loadingAvailable = false;
      },
      error: () => {
        this.error = 'Impossible de charger la liste des partenaires';
        this.loadingAvailable = false;
      }
    });
  }

  onSearchInput(): void {
    const q = this.searchQuery.toLowerCase().trim();
    this.filteredPartners = this.availablePartners.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.email.toLowerCase().includes(q) ||
      (p.organization && p.organization.toLowerCase().includes(q))
    );
    this.showDropdown = true;
    if (this.selectedPartner && this.selectedPartner.name !== this.searchQuery) {
      this.selectedPartner = null;
      this.inviteForm = { partnerId: '', partnerEmail: '', partnerName: '' };
    }
  }

  selectPartner(partner: PartnerSummary): void {
    this.selectedPartner = partner;
    this.inviteForm.partnerId = partner.ref;
    this.inviteForm.partnerEmail = partner.email;
    this.inviteForm.partnerName = partner.name;
    this.searchQuery = partner.name;
    this.showDropdown = false;
  }

  clearSelection(): void {
    this.selectedPartner = null;
    this.inviteForm = { partnerId: '', partnerEmail: '', partnerName: '' };
    this.searchQuery = '';
    this.filteredPartners = this.availablePartners;
  }

  invitePartner(): void {
    if (!this.event || !this.selectedPartner) {
      this.error = 'Veuillez sélectionner un partenaire dans la liste';
      return;
    }
    this.loading = true;
    this.error = '';
    this.eventService.invitePartner(this.event.id, this.inviteForm).subscribe({
      next: () => {
        this.success = `✅ Invitation envoyée à ${this.selectedPartner!.name}`;
        this.showInviteForm = false;
        this.clearSelection();
        this.loadPartners(this.event.id);
      },
      error: (err) => {
        this.error = err.error?.message || 'Erreur lors de l\'invitation';
        this.loading = false;
      }
    });
  }

  cancelInvite(): void {
    this.showInviteForm = false;
    this.clearSelection();
    this.error = '';
  }

  goBack(): void {
    this.router.navigate(['/events/admin/list']);
  }

  getStatusClass(status: PartnerStatus): string {
    switch (status) {
      case PartnerStatus.PENDING:  return 'badge-pending';
      case PartnerStatus.ACCEPTED: return 'badge-accepted';
      case PartnerStatus.REFUSED:  return 'badge-refused';
      default: return '';
    }
  }

  getStatusLabel(status: PartnerStatus): string {
    switch (status) {
      case PartnerStatus.PENDING:  return 'En attente';
      case PartnerStatus.ACCEPTED: return 'Accepté';
      case PartnerStatus.REFUSED:  return 'Refusé';
      default: return status;
    }
  }

  getInitials(name: string): string {
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  }
}
