import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MyProjectsService } from '../../../services/my-projects.service';
import { ApiProject } from '../../../models/my-project.model';

@Component({
  selector: 'app-open-projects',
  templateUrl: './open-projects.component.html',
  styleUrls: ['./open-projects.component.css']
})
export class OpenProjectsComponent implements OnInit {

  projects: ApiProject[] = [];
  filteredProjects: ApiProject[] = [];

  loading = true;
  error: string | null = null;

  searchQuery = '';

  constructor(
    private projectService: MyProjectsService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadOpenProjects();
  }

  loadOpenProjects(): void {
    this.loading = true;
    this.error = null;

    this.projectService.getAllProjects().subscribe({
      next: (data: ApiProject[]) => {

        // garder seulement les OPEN
        this.projects = data.filter(
          p => p.status?.toUpperCase() === 'OPEN'
        );

        this.filteredProjects = [...this.projects];
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading projects:', err);
        this.error = 'Failed to load projects';
        this.loading = false;
      }
    });
  }

  // 🔎 Search
  onSearchChange(value: string): void {
    this.searchQuery = value;
    const q = value?.toLowerCase().trim();

    if (!q) {
      this.filteredProjects = [...this.projects];
      return;
    }

    this.filteredProjects = this.projects.filter(project =>
      (project.title ?? '').toLowerCase().includes(q) ||
      (project.shortDescription ?? '').toLowerCase().includes(q) ||
      (project.category ?? '').toLowerCase().includes(q)
    );
  }

  viewDetails(id?: number): void {
    if (!id) return;
    this.router.navigate(['/projects', id]);
  }

  submitOffer(id?: number): void {
    if (!id) return;

    // navigation correcte vers le formulaire
    this.router.navigate(['/my-offers/create', id]);
  }
}