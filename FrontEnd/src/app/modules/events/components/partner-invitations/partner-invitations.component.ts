import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { EventService } from '../../../../core/services/event.service';
import {
  EventPartner, PartnerStatus, ContentType, AddContentRequest
} from '../../../../core/models/event.model';

@Component({
  selector: 'app-partner-invitations',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './partner-invitations.component.html',
  styleUrls: ['./partner-invitations.component.css']
})
export class PartnerInvitationsComponent implements OnInit {

  invitations: EventPartner[] = [];
  loading = false;
  error = '';
  success = '';

  // Which invitation is being acted on
  activeInvitation: EventPartner | null = null;
  showAcceptPanel = false;
  showRefuseConfirm = false;
  submitting = false;

  PartnerStatus = PartnerStatus;
  ContentType = ContentType;
  contentTypes = Object.values(ContentType);

  contentForm: AddContentRequest = {
    type: ContentType.WORKSHOP,
    title: '',
    description: '',
    resourceUrl: ''
  };

  constructor(
    private eventService: EventService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadInvitations();
  }

  loadInvitations(): void {
    this.loading = true;
    this.eventService.getMyInvitations().subscribe({
      next: (data) => { this.invitations = data; this.loading = false; },
      error: () => { this.error = 'Erreur lors du chargement des invitations'; this.loading = false; }
    });
  }

  get pending()  { return this.invitations.filter(i => i.status === PartnerStatus.PENDING); }
  get accepted() { return this.invitations.filter(i => i.status === PartnerStatus.ACCEPTED); }
  get refused()  { return this.invitations.filter(i => i.status === PartnerStatus.REFUSED); }

  openAccept(inv: EventPartner): void {
    this.activeInvitation = inv;
    this.showAcceptPanel = true;
    this.showRefuseConfirm = false;
    this.error = '';
    this.contentForm = { type: ContentType.WORKSHOP, title: '', description: '', resourceUrl: '' };
  }

  openRefuse(inv: EventPartner): void {
    this.activeInvitation = inv;
    this.showRefuseConfirm = true;
    this.showAcceptPanel = false;
    this.error = '';
  }

  cancelAction(): void {
    this.activeInvitation = null;
    this.showAcceptPanel = false;
    this.showRefuseConfirm = false;
    this.error = '';
  }

  submitAccept(): void {
    if (!this.activeInvitation) return;
    if (!this.contentForm.title.trim()) { this.error = 'Le titre de la contribution est requis'; return; }

    this.submitting = true;
    this.error = '';
    const inv = this.activeInvitation;

    this.eventService.respondToInvitation(inv.invitationToken, PartnerStatus.ACCEPTED).subscribe({
      next: () => {
        this.eventService.addEventContent(inv.eventId, this.contentForm).subscribe({
          next: () => {
            this.success = `✅ Vous avez accepté l'invitation pour "${inv.eventTitle}". Votre contribution a été soumise.`;
            this.cancelAction();
            this.loadInvitations();
            this.submitting = false;
          },
          error: () => {
            this.success = `✅ Invitation acceptée pour "${inv.eventTitle}". (Contribution non enregistrée)`;
            this.cancelAction();
            this.loadInvitations();
            this.submitting = false;
          }
        });
      },
      error: (err) => {
        this.error = err.error?.message || 'Erreur lors de l\'acceptation';
        this.submitting = false;
      }
    });
  }

  submitRefuse(): void {
    if (!this.activeInvitation) return;
    this.submitting = true;
    this.error = '';
    const inv = this.activeInvitation;

    this.eventService.respondToInvitation(inv.invitationToken, PartnerStatus.REFUSED).subscribe({
      next: () => {
        this.success = `Vous avez refusé l'invitation pour "${inv.eventTitle}".`;
        this.cancelAction();
        this.loadInvitations();
        this.submitting = false;
      },
      error: (err) => {
        this.error = err.error?.message || 'Erreur lors du refus';
        this.submitting = false;
      }
    });
  }

  getContentTypeLabel(type: ContentType): string {
    const labels: Record<ContentType, string> = {
      [ContentType.WORKSHOP]:  '🛠 Atelier',
      [ContentType.OFFER]:     '🎁 Offre',
      [ContentType.FORMATION]: '🎓 Formation',
      [ContentType.DOCUMENT]:  '📄 Document'
    };
    return labels[type] || type;
  }

  getCategoryLabel(cat: string): string {
    const map: Record<string, string> = {
      TECHNOLOGY: 'Tech', DESIGN: 'Design', MARKETING: 'Marketing',
      FINANCE: 'Finance', ENTREPRENEURSHIP: 'Entrepreneuriat',
      DATA_SCIENCE: 'Data Science', CYBERSECURITY: 'Cybersécurité',
      WEB_DEVELOPMENT: 'Web', MOBILE_DEVELOPMENT: 'Mobile', OTHER: 'Autre'
    };
    return map[cat] || cat;
  }
}
