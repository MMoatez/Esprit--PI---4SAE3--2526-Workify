import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FavoritesService } from '../../../core/services/Favorites.service';
import { ApiProject } from '../../../core/models/my-project.model';

@Component({
  standalone: false,   // ← AJOUT
  selector: 'app-favorites',
  templateUrl: './favorites.component.html',
  styleUrls: []
})
export class FavoritesComponent implements OnInit {

  favorites: ApiProject[] = [];

  private readonly projectImages: string[] = [
    'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1400&q=80',
    'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=1400&q=80',
    'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=1400&q=80',
    'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1400&q=80',
    'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1400&q=80',
    'https://images.unsplash.com/photo-1526379095098-d400fd0bf935?auto=format&fit=crop&w=1400&q=80',
  ];

  readonly fallbackImage = 'https://picsum.photos/seed/workify-fav/1400/700';

  constructor(
    private favoritesService: FavoritesService,
    private router: Router,
  ) {}

  ngOnInit(): void { this.load(); }

  load(): void { this.favorites = this.favoritesService.getAll(); }

  remove(projectId: number): void { this.favoritesService.remove(projectId); this.load(); }

  clearAll(): void { this.favoritesService.clearAll(); this.load(); }

  viewDetails(id?: number): void { if (!id) return; this.router.navigate(['/projects', id]); }

  goBack(): void { this.router.navigate(['/projects/open']); }

  getProjectImage(projectId?: number | null): string {
    const safeId = projectId ?? 0;
    return this.projectImages[Math.abs(safeId) % this.projectImages.length];
  }

  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement | null;
    if (img && img.src !== this.fallbackImage) img.src = this.fallbackImage;
  }
}
