
import { Component, OnInit } from '@angular/core';
import { OffersService, CreateOfferRequest } from '../../core/services/offers.service';
import { ContractService } from '../../core/services/contract.service';
import { ReviewService } from '../../core/services/Review.service';
import { MyOffer, OfferStatus } from '../../core/models/my-offer.model';
import { AuthService } from '../../core/services/auth.service';
import { ApiProject } from '../../core/models/my-project.model';
import { MyProjectsService } from '../../core/services/my-projects.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { EvaluationStatusDto, FeedbackDto } from '../../core/models/feedback.model';

@Component({
  standalone: false,
  selector: 'app-my-offers',
  templateUrl: './my-offers.component.html',
  styleUrls: ['./my-offers.component.css'],
})
export class MyOffersComponent implements OnInit {

  offers: MyOffer[]         = [];
  filteredOffers: MyOffer[] = [];
  isLoading = true;
  error: string | null = null;

  // Filters
  searchQuery    = '';
  selectedBudget = 'All Budgets';

  // Stats
  activeOffers     = 0;
  totalEarnings    = 0;
  pendingProposals = 0;

  // Modal confirm
  isModalOpen   = false;
  selectedOffer: MyOffer | null = null;
  isConfirming  = false;
  modalAction: 'accept' | 'reject' | null = null;

  // Contrat
  generatingContractId: number | null = null;
  contractSuccess: number | null      = null;

  // Freelancer create-offer popup
  isCreateModalOpen = false;
  isCreatingOffer   = false;
  createOfferError: string | null = null;
  availableProjects: ApiProject[] = [];
  selectedProjectId: number | null = null;
  newOfferPayload: CreateOfferRequest = {
    price: 0,
    deliveryTime: '7 days',
    description: '',
  };

  // ══════════════════════════════════════════════════
  // ⭐ REVIEW
  // ══════════════════════════════════════════════════
  reviewOfferId: number | null   = null;   // offre en cours d'évaluation
  reviewRating  = 0;                        // étoiles sélectionnées (1-5)
  reviewHover   = 0;                        // étoile survolée
  reviewComment = '';                       // commentaire
  isSubmittingReview = false;
  reviewSuccess: number | null = null;      // id offre évaluée avec succès

  // Réponse freelancer
  replyOfferId: number | null = null;
  replyText    = '';
  isSubmittingReply = false;

  private freelancerId: number | null = null;

  // ══════════════════════════════════════════════════
  // NOUVEAU SYSTEME FEEDBACK COMPLET (feedback-service)
  // ══════════════════════════════════════════════════
  evaluationStatuses: Map<number, EvaluationStatusDto> = new Map();
  existingFeedbacks:  Map<number, FeedbackDto>         = new Map();
  feedbackFormOpen:   Set<number>                      = new Set();
  feedbackSuccess:    number | null                    = null;

  constructor(
    private offersService:    OffersService,
    private contractService:  ContractService,
    private reviewService:    ReviewService,
    private authService:      AuthService,
    private myProjectsService: MyProjectsService,
    private feedbackService:  FeedbackService,
  ) {}

  get isClient(): boolean {
    return this.authService.getCurrentRole() === 'client';
  }

  get isFreelancer(): boolean {
    return this.authService.getCurrentRole() === 'freelancer';
  }

  ngOnInit(): void {
    if (this.isFreelancer) {
      const email  = this.authService.getUserEmail();
      const name   = this.authService.getUserName();
      const userId = this.authService.getNumericUserId() ?? 0;
      if (email && name) {
        this.offersService.syncFreelancer(userId, name, email).subscribe({
          next: (f) => { this.freelancerId = f.id; this.loadOffers(); },
          error: ()  => { this.loadOffers(); }
        });
      } else {
        this.loadOffers();
      }
      this.loadAvailableProjects();
    } else {
      this.loadOffers();
    }
  }

  // ── Chargement ─────────────────────────────────────────
  loadOffers(): void {
    this.isLoading = true;
    this.error     = null;

    const clientEmail = this.authService.getUserEmail();

    const load$ = this.isClient && clientEmail
      ? this.offersService.getOffersByClientEmail(clientEmail)
      : (this.isFreelancer && this.freelancerId)
        ? this.offersService.getOffersByFreelancer(this.freelancerId)
        : this.offersService.getAllOffers();

    load$.subscribe({
      next: (data) => {
        this.offers         = data || [];
        this.filteredOffers = [...this.offers];
        this.calculateStatistics();
        this.isLoading = false;
        // Charger le statut d'évaluation pour les offres ACCEPTED
        this.loadEvaluationStatuses();
      },
      error: (err) => {
        console.error('Error loading offers:', err);
        this.error     = 'Failed to load offers.';
        this.isLoading = false;
      }
    });
  }

  // ── Stats ───────────────────────────────────────────────
  calculateStatistics(): void {
    this.activeOffers     = this.offers.length;
    this.totalEarnings    = this.offers.reduce((sum, o) => sum + (o.price ?? 0), 0);
    this.pendingProposals = this.offers.filter(o => o.status === OfferStatus.PENDING).length;
  }

  // ── Filtres ─────────────────────────────────────────────
  applyFilters(): void {
    let filtered = [...this.offers];

    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      filtered = filtered.filter(o =>
        o.message?.toLowerCase().includes(q) ||
        o.project?.title?.toLowerCase().includes(q) ||
        o.freelancer?.nom?.toLowerCase().includes(q)
      );
    }

    if (this.selectedBudget !== 'All Budgets') {
      filtered = filtered.filter(o => {
        const price = o.price ?? 0;
        if (this.selectedBudget === 'Under $500')   return price < 500;
        if (this.selectedBudget === '$500 - $2000') return price >= 500 && price <= 2000;
        if (this.selectedBudget === '$2000+')       return price > 2000;
        return true;
      });
    }

    this.filteredOffers = filtered;
  }

  onSearchChange(query: string): void {
    this.searchQuery = query;
    this.applyFilters();
  }

  onBudgetChange(budget: string): void {
    this.selectedBudget = budget;
    this.applyFilters();
  }

  // ── Modal Accept/Reject ──────────────────────────────────
  acceptOffer(id?: number): void {
    if (!this.isClient || !id) return;
    const offer = this.offers.find(o => o.id === id);
    if (!offer) return;
    this.selectedOffer = offer;
    this.modalAction   = 'accept';
    this.isModalOpen   = true;
  }

  rejectOffer(id?: number): void {
    if (!this.isClient || !id) return;
    const offer = this.offers.find(o => o.id === id);
    if (!offer) return;
    this.selectedOffer = offer;
    this.modalAction   = 'reject';
    this.isModalOpen   = true;
  }

  closeModal(): void {
    this.isModalOpen   = false;
    this.selectedOffer = null;
    this.modalAction   = null;
    this.isConfirming  = false;
  }

  confirmAction(): void {
    if (!this.isClient || !this.selectedOffer || !this.modalAction) return;
    this.isConfirming = true;

    const acceptedOffer = this.selectedOffer;
    const wasAccepting  = this.modalAction === 'accept';

    const request$ = wasAccepting
      ? this.offersService.acceptOffer(this.selectedOffer.id!)
      : this.offersService.rejectOffer(this.selectedOffer.id!);

    request$.subscribe({
      next: (updatedOffer) => {
        const index = this.offers.findIndex(o => o.id === updatedOffer.id);
        if (index > -1) this.offers[index] = updatedOffer;
        this.applyFilters();
        this.calculateStatistics();
        this.closeModal();
        if (wasAccepting) this.generateContractForOffer(acceptedOffer);
      },
      error: (err) => {
        console.error('Error updating offer:', err);
        this.isConfirming = false;
      }
    });
  }

  // ══════════════════════════════════════════════════
  // ⭐ REVIEW METHODS
  // ══════════════════════════════════════════════════

  openReviewForm(offerId: number): void {
    this.reviewOfferId  = offerId;
    this.reviewRating   = 0;
    this.reviewHover    = 0;
    this.reviewComment  = '';
  }

  closeReviewForm(): void {
    this.reviewOfferId = null;
    this.reviewRating  = 0;
    this.reviewHover   = 0;
    this.reviewComment = '';
  }

  setRating(star: number): void {
    this.reviewRating = star;
  }

  submitReview(offerId: number): void {
    if (this.reviewRating === 0) return;
    this.isSubmittingReview = true;

    this.reviewService.submitReview(offerId, {
      rating:  this.reviewRating,
      comment: this.reviewComment,
    }).subscribe({
      next: (updatedOffer) => {
        // Met à jour l'offre localement
        const index = this.offers.findIndex(o => o.id === offerId);
        if (index > -1) this.offers[index] = { ...this.offers[index], ...updatedOffer };
        this.applyFilters();

        this.isSubmittingReview = false;
        this.reviewSuccess      = offerId;
        this.closeReviewForm();
        setTimeout(() => { this.reviewSuccess = null; }, 4000);
      },
      error: (err) => {
        console.error('Error submitting review:', err);
        this.isSubmittingReview = false;
      }
    });
  }

  // Réponse freelancer
  openReplyForm(offerId: number): void {
    this.replyOfferId = offerId;
    this.replyText    = '';
  }

  closeReplyForm(): void {
    this.replyOfferId = null;
    this.replyText    = '';
  }

  submitReply(offerId: number): void {
    if (!this.replyText.trim()) return;
    this.isSubmittingReply = true;

    this.reviewService.submitReply(offerId, { reply: this.replyText }).subscribe({
      next: (updatedOffer) => {
        const index = this.offers.findIndex(o => o.id === offerId);
        if (index > -1) this.offers[index] = { ...this.offers[index], ...updatedOffer };
        this.applyFilters();
        this.isSubmittingReply = false;
        this.closeReplyForm();
      },
      error: (err) => {
        console.error('Error submitting reply:', err);
        this.isSubmittingReply = false;
      }
    });
  }

  getStars(rating: number): number[] {
    return [1, 2, 3, 4, 5];
  }

  // ── Create Offer (Freelancer) ────────────────────────────
  openCreateModal(): void {
    if (this.isClient) return;
    this.createOfferError  = null;
    this.isCreateModalOpen = true;
  }

  closeCreateModal(): void {
    this.isCreateModalOpen = false;
    this.isCreatingOffer   = false;
    this.createOfferError  = null;
    this.newOfferPayload   = { price: 0, deliveryTime: '7 days', description: '' };
  }

  submitCreateOffer(): void {
    if (this.isClient) return;
    if (!this.freelancerId) { this.createOfferError = 'Could not identify your freelancer account. Please refresh.'; return; }
    if (!this.selectedProjectId) { this.createOfferError = 'Please select a project.'; return; }
    if (!this.newOfferPayload.price || this.newOfferPayload.price <= 0) { this.createOfferError = 'Please enter a valid price.'; return; }
    if (!this.newOfferPayload.deliveryTime.trim()) { this.createOfferError = 'Please provide delivery time.'; return; }
    if (!this.newOfferPayload.description.trim()) { this.createOfferError = 'Please provide a description.'; return; }

    this.createOfferError  = null;
    this.isCreatingOffer   = true;

    this.offersService.createOfferForProject(
      this.selectedProjectId,
      this.freelancerId ?? 0,
      {
        price:        this.newOfferPayload.price,
        deliveryTime: this.newOfferPayload.deliveryTime.trim(),
        description:  this.newOfferPayload.description.trim(),
      },
    ).subscribe({
      next: () => { this.closeCreateModal(); this.loadOffers(); },
      error: (err) => {
        console.error('Error creating offer:', err);
        this.createOfferError = 'Failed to create offer. Please try again.';
        this.isCreatingOffer  = false;
      },
    });
  }

  private loadAvailableProjects(): void {
    this.myProjectsService.getAllProjects().subscribe({
      next: (projects) => {
        this.availableProjects = (projects || []).filter(p => p?.id != null);
        this.selectedProjectId = this.availableProjects[0]?.id ?? null;
      },
      error: () => { this.availableProjects = []; },
    });
  }

  // ── Contrat ──────────────────────────────────────────────
  generateContractForOffer(offer: MyOffer): void {
    if (!offer?.id) return;
    this.generatingContractId = offer.id;
    this.contractSuccess      = null;

    const today = new Date().toISOString().slice(0, 10);
    const delai = offer.duration ? `${offer.duration} jours` : '30 jours';

    const req = {
      projet_id:             String(offer.project?.id ?? offer.id),
      projet_titre:          offer.project?.title ?? `Projet #${offer.id}`,
      projet_description:    offer.message ?? 'Prestation freelance',
      projet_budget:         offer.price ?? 0,
      projet_delai:          delai,
      projet_debut:          today,
      client_nom:            'Client',
      client_email:          'client@workify.com',
      freelancer_nom:        offer.freelancer?.nom ?? 'Freelancer',
      freelancer_email:      offer.freelancer?.email ?? 'freelancer@workify.com',
      freelancer_specialite: 'Développeur',
      offre_montant:         offer.price ?? 0,
      offre_devise:          'TND',
    };

    this.contractService.generateContract(req).subscribe({
      next: (blob) => {
        const filename = `contrat_offre_${offer.id}_${today}.pdf`;
        this.contractService.downloadPdf(blob, filename);
        this.generatingContractId = null;
        this.contractSuccess      = offer.id!;
        setTimeout(() => { this.contractSuccess = null; }, 5000);
      },
      error: (err) => {
        console.error('Erreur génération contrat:', err);
        this.generatingContractId = null;
      }
    });
  }

  downloadContract(offer: MyOffer): void {
    this.generateContractForOffer(offer);
  }

  // ── Nouveau Feedback complet ─────────────────────────────

  loadEvaluationStatuses(): void {
    const acceptedOffers = this.offers.filter(o =>
      (o.status === OfferStatus.ACCEPTED || o.status === OfferStatus.COMPLETED) && o.id
    );

    if (this.isClient) {
      acceptedOffers.forEach(o => {
        this.feedbackService.getEvaluationStatus(o.id!).subscribe({
          next: (status) => {
            this.evaluationStatuses.set(o.id!, status);
            if (status.hasFeedback) {
              this.feedbackService.getFeedbackByOffer(o.id!).subscribe({
                next: (fb) => this.existingFeedbacks.set(o.id!, fb),
                error: () => {}
              });
            }
          },
          error: () => {}
        });
      });
    } else if (this.isFreelancer) {
      acceptedOffers.forEach(o => {
        this.feedbackService.getEvaluationStatus(o.id!).subscribe({
          next: (status) => {
            this.evaluationStatuses.set(o.id!, status);
            if (status.hasFeedback) {
              this.feedbackService.getFeedbackByOffer(o.id!).subscribe({
                next: (fb) => this.existingFeedbacks.set(o.id!, fb),
                error: () => {}
              });
            }
          },
          error: () => {}
        });
      });
    }
  }

  getEvaluationStatus(offerId: number): EvaluationStatusDto | null {
    return this.evaluationStatuses.get(offerId) || null;
  }

  hasFeedback(offerId: number): boolean {
    return this.existingFeedbacks.has(offerId);
  }

  getExistingFeedback(offerId: number): FeedbackDto | null {
    return this.existingFeedbacks.get(offerId) || null;
  }

  openFeedbackForm(offerId: number): void {
    const offer = this.offers.find(o => o.id === offerId);
    if (!offer) return;

    // Trigger evaluation window now that the client intentionally opened the form
    const triggerBody = {
      offerId:      offerId,
      clientEmail:  this.authService.getUserEmail() ?? '',
      freelancerId: offer.freelancer?.id ?? 0,
      projectTitle: offer.project?.title ?? `Projet #${offerId}`,
    };
    this.feedbackService.triggerEvaluation(triggerBody).subscribe({
      next:  () => this.refreshEvaluationStatus(offerId),
      error: () => this.refreshEvaluationStatus(offerId), // idempotent
    });

    this.feedbackFormOpen.add(offerId);
  }

  closeFeedbackForm(offerId: number): void {
    this.feedbackFormOpen.delete(offerId);
  }

  isFeedbackFormOpen(offerId: number): boolean {
    return this.feedbackFormOpen.has(offerId);
  }

  onFeedbackSubmitted(offerId: number, fb: FeedbackDto): void {
    this.existingFeedbacks.set(offerId, fb);
    this.feedbackFormOpen.delete(offerId);
    this.feedbackSuccess = offerId;
    const status = this.evaluationStatuses.get(offerId);
    if (status) {
      this.evaluationStatuses.set(offerId, { ...status, evaluationPending: false, hasFeedback: true });
    }
    setTimeout(() => { this.feedbackSuccess = null; }, 4000);
  }

  onFeedbackCardUpdated(offerId: number, fb: FeedbackDto): void {
    this.existingFeedbacks.set(offerId, fb);
  }

  onFeedbackDeleted(offerId: number): void {
    this.existingFeedbacks.delete(offerId);
    const status = this.evaluationStatuses.get(offerId);
    if (status) {
      this.evaluationStatuses.set(offerId, { ...status, hasFeedback: false, evaluationPending: false });
    }
  }

  onEvaluationStatusUpdate(offerId: number, status: EvaluationStatusDto): void {
    this.evaluationStatuses.set(offerId, status);
  }

  triggeringEvaluation: number | null = null;
  completingOfferId:    number | null = null;

  markAsCompleted(offer: MyOffer): void {
    if (!offer.id) return;
    this.completingOfferId = offer.id;
    this.offersService.completeOffer(offer.id).subscribe({
      next: (updated) => {
        const idx = this.offers.findIndex(o => o.id === offer.id);
        if (idx > -1) this.offers[idx] = updated;
        this.applyFilters();
        this.completingOfferId = null;
        // No auto-trigger: evaluation window opens only when client clicks feedback
      },
      error: () => { this.completingOfferId = null; }
    });
  }

  private refreshEvaluationStatus(offerId: number): void {
    this.feedbackService.getEvaluationStatus(offerId).subscribe({
      next:  (status) => this.evaluationStatuses.set(offerId, status),
      error: () => {}
    });
  }

  manualTriggerEvaluation(offer: MyOffer): void {
    if (!offer.id) return;
    this.triggeringEvaluation = offer.id;
    const body = {
      offerId:      offer.id,
      clientEmail:  this.authService.getUserEmail() ?? '',
      freelancerId: offer.freelancer?.id ?? 0,
      projectTitle: offer.project?.title ?? `Projet #${offer.id}`,
    };
    this.feedbackService.triggerEvaluation(body).subscribe({
      next: () => {
        this.triggeringEvaluation = null;
        this.refreshEvaluationStatus(offer.id!);
      },
      error: () => { this.triggeringEvaluation = null; }
    });
  }

  // ── Helpers ──────────────────────────────────────────────
  getStatusColor(status?: OfferStatus): string {
    switch (status) {
      case OfferStatus.ACCEPTED: return 'bg-green-50 text-green-700 border-green-200';
      case OfferStatus.REJECTED: return 'bg-red-50 text-red-700 border-red-200';
      default:                   return 'bg-cyan-50 text-cyan-700 border-cyan-200';
    }
  }

  formatDate(dateString?: string): string {
    if (!dateString) return 'N/A';
    const date     = new Date(dateString);
    const now      = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7)  return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  }
}
