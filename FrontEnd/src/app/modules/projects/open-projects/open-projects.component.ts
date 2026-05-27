import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MyProjectsService } from '../../../core/services/my-projects.service';
import { ApiProject } from '../../../core/models/my-project.model';
import { CreateOfferRequest, OffersService } from '../../../core/services/offers.service';
import { FavoritesService } from '../../../core/services/Favorites.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  standalone: false,   // ← AJOUT
  selector: 'app-open-projects',
  templateUrl: './open-projects.component.html',
  styleUrls: ['./open-projects.component.css']
})
export class OpenProjectsComponent implements OnInit {

  projects: ApiProject[] = [];
  filteredProjects: ApiProject[] = [];
  loading = true;
  error: string | null = null;
  successMessage: string | null = null;
  searchQuery = '';
  isOfferModalOpen = false;
  isSubmittingOffer = false;
  offerError: string | null = null;
  selectedProject: ApiProject | null = null;
  favoriteToast: string | null = null;
  private freelancerId: number | null = null;

  private readonly projectImages: string[] = [
    'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1400&q=80',
    'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=1400&q=80',
    'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=1400&q=80',
    'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1400&q=80',
    'https://images.unsplash.com/photo-1551434678-e076c223a692?auto=format&fit=crop&w=1400&q=80',
    'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1400&q=80',
    'https://images.unsplash.com/photo-1504639725590-34d0984388bd?auto=format&fit=crop&w=1400&q=80',
    'https://images.unsplash.com/photo-1547658719-da2b51169166?auto=format&fit=crop&w=1400&q=80',
    'https://images.unsplash.com/photo-1517430816045-df4b7de1a1e1?auto=format&fit=crop&w=1400&q=80',
    'https://images.unsplash.com/photo-1515876305430-f06edab8282a?auto=format&fit=crop&w=1400&q=80',
    'https://images.unsplash.com/photo-1492724441997-5dc865305da7?auto=format&fit=crop&w=1400&q=80',
  ];

  readonly fallbackProjectImage = 'https://picsum.photos/seed/workify-fallback/1400/700';

  offerPayload: CreateOfferRequest = { price: 0, deliveryTime: '7 days', description: '' };

  constructor(
    private projectService: MyProjectsService,
    private router: Router,
    private offersService: OffersService,
    public favoritesService: FavoritesService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadOpenProjects();
    this.syncFreelancerIfNeeded();
  }

  private syncFreelancerIfNeeded(): void {
    if (this.authService.getRole() !== 'FREELANCER') return;
    const email  = this.authService.getUserEmail();
    const name   = this.authService.getUserName();
    const userId = this.authService.getNumericUserId() ?? 0;
    if (email && name) {
      this.offersService.syncFreelancer(userId, name, email).subscribe({
        next: (f) => { this.freelancerId = f.id; },
        error: () => {}
      });
    }
  }

  loadOpenProjects(): void {
    this.loading = true;
    this.error = null;
    this.projectService.getAllProjects().subscribe({
      next: (data: ApiProject[]) => {
        this.projects = data.filter(p => p.status?.toUpperCase() === 'OPEN');
        this.filteredProjects = [...this.projects];
        this.loading = false;
      },
      error: (err: any) => {
        console.error('Error loading projects:', err);
        this.error = 'Failed to load projects';
        this.loading = false;
      }
    });
  }

  onSearchChange(value: string): void {
    this.searchQuery = value;
    const q = value?.toLowerCase().trim();
    if (!q) { this.filteredProjects = [...this.projects]; return; }
    this.filteredProjects = this.projects.filter(p =>
      (p.title ?? '').toLowerCase().includes(q) ||
      (p.shortDescription ?? '').toLowerCase().includes(q) ||
      (p.category ?? '').toLowerCase().includes(q)
    );
  }

  viewDetails(id?: number): void { if (!id) return; this.router.navigate(['/projects', id]); }

  getProjectImage(projectId?: number | null): string {
    const safeId = projectId ?? 1;
    return this.projectImages[(safeId * 7) % this.projectImages.length];
  }

  onProjectImageError(event: Event): void {
    const img = event.target as HTMLImageElement | null;
    if (img && img.src !== this.fallbackProjectImage) img.src = this.fallbackProjectImage;
  }

  toggleFavorite(project: ApiProject): void {
    const added = this.favoritesService.toggle(project);
    this.favoriteToast = added ? `❤️ "${project.title}" ajouté aux favoris` : `🗑 "${project.title}" retiré des favoris`;
    setTimeout(() => { this.favoriteToast = null; }, 3000);
  }

  isFavorite(projectId?: number): boolean { return projectId ? this.favoritesService.isFavorite(projectId) : false; }
  get favoritesCount(): number { return this.favoritesService.count(); }
  goToFavorites(): void { this.router.navigate(['/projects/favorites']); }

  submitOffer(id?: number): void {
    if (!id) return;
    const project = this.projects.find(p => p.id === id);
    if (!project) return;
    this.selectedProject = project;
    this.offerError = null;
    this.offerPayload = { price: 0, deliveryTime: '7 days', description: '' };
    this.isOfferModalOpen = true;
  }

  closeOfferModal(): void {
    this.isOfferModalOpen = false;
    this.isSubmittingOffer = false;
    this.offerError = null;
    this.selectedProject = null;
  }

  confirmSubmitOffer(): void {
    if (!this.selectedProject?.id) { this.offerError = 'Project is missing.'; return; }
    if (!this.freelancerId) { this.offerError = 'Could not identify your freelancer account. Please refresh.'; return; }
    if (!this.offerPayload.price || this.offerPayload.price <= 0) { this.offerError = 'Please enter a valid price.'; return; }
    if (!this.offerPayload.deliveryTime.trim()) { this.offerError = 'Please provide delivery time.'; return; }
    if (!this.offerPayload.description.trim()) { this.offerError = 'Please provide a description.'; return; }

    this.offerError = null;
    this.isSubmittingOffer = true;

    this.offersService.createOfferForProject(
      this.selectedProject.id,
      this.freelancerId,
      {
        price: this.offerPayload.price,
        deliveryTime: this.offerPayload.deliveryTime.trim(),
        description: this.offerPayload.description.trim(),
      }
    ).subscribe({
      next: () => {
        this.successMessage = 'Offer submitted successfully.';
        this.closeOfferModal();
        setTimeout(() => { this.successMessage = null; }, 3000);
      },
      error: (err: any) => {
        console.error('Submit offer error:', err);
        this.offerError = 'Failed to submit offer. Please try again.';
        this.isSubmittingOffer = false;
      }
    });
  }
}
