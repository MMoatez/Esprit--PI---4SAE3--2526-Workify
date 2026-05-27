import { Component, OnInit } from '@angular/core';
import { OffersService } from '../../services/offers.service';
import { ContractService } from '../../services/contract.service';
import { MyOffer, OfferStatus } from '../../models/my-offer.model';

@Component({
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

  constructor(
    private offersService: OffersService,
    private contractService: ContractService
  ) {}

  ngOnInit(): void {
    this.loadOffers();
  }

  // ── Chargement ─────────────────────────────────────────
  loadOffers(): void {
    this.isLoading = true;
    this.error     = null;

    this.offersService.getAllOffers().subscribe({
      next: (data) => {
        this.offers         = data || [];
        this.filteredOffers = [...this.offers];
        this.calculateStatistics();
        this.isLoading = false;
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
    this.activeOffers    = this.offers.length;
    this.totalEarnings   = this.offers.reduce((sum, o) => sum + (o.price ?? 0), 0);
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

  // ── Modal ────────────────────────────────────────────────
  acceptOffer(id?: number): void {
    if (!id) return;
    const offer = this.offers.find(o => o.id === id);
    if (!offer) return;
    this.selectedOffer = offer;
    this.modalAction   = 'accept';
    this.isModalOpen   = true;
  }

  rejectOffer(id?: number): void {
    if (!id) return;
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
    if (!this.selectedOffer || !this.modalAction) return;
    this.isConfirming = true;

    const acceptedOffer  = this.selectedOffer;
    const wasAccepting   = this.modalAction === 'accept';

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

        // Génération automatique du contrat PDF après acceptation
        if (wasAccepting) {
          this.generateContractForOffer(acceptedOffer);
        }
      },
      error: (err) => {
        console.error('Error updating offer:', err);
        this.isConfirming = false;
      }
    });
  }

  // ── Génération contrat ──────────────────────────────────
  generateContractForOffer(offer: MyOffer): void {
    if (!offer?.id) return;

    this.generatingContractId = offer.id;
    this.contractSuccess      = null;

    const today    = new Date().toISOString().slice(0, 10);
    // duration est number|null dans ton modèle
    const delai    = offer.duration ? `${offer.duration} jours` : '30 jours';

    const req = {
      projet_id:             String(offer.project?.id ?? offer.id),
      projet_titre:          offer.project?.title ?? `Projet #${offer.id}`,
      projet_description:    offer.message ?? 'Prestation freelance',
      projet_budget:         offer.price ?? 0,
      projet_delai:          delai,
      projet_debut:          today,
      // Ton modèle n'a pas clientName → valeurs par défaut
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

  // Bouton manuel pour re-télécharger
  downloadContract(offer: MyOffer): void {
    this.generateContractForOffer(offer);
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