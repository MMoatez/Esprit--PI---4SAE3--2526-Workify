import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiProject, MyProject } from '../../../models/my-project.model';
import { MyProjectsService } from '../../../services/my-projects.service';
import { MatchingService, MatchingResult } from '../../../services/matching.service';

type ProjectCard = MyProject & {
  clientId: string;
  minBudget: number;
  maxBudget: number;
  duration: string;
  status: string;
  createdAt: string;
};

@Component({
  selector: 'app-my-project-details',
  templateUrl: './my-project-details.component.html',
  styleUrls: ['./my-project-details.component.css'],
})
export class MyProjectDetailsComponent implements OnInit {

  project?: ProjectCard;
  loading = true;
  loadingMatching = false;
  matchingResults: MatchingResult[] = [];

  projectId!: number;
  notFound = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private myProjectsService: MyProjectsService,
    private matchingService: MatchingService
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      this.projectId = +params['id'];
      this.loadProject();
    });
  }

  loadProject(): void {
    this.loading = true;

    this.myProjectsService.getProjectById(this.projectId).subscribe({
      next: (project) => {
        this.project = this.mapApiProject(project);
        this.notFound = false;
        this.loading = false;

        this.loadMatching(); // 🔥 charger matching ici
      },
      error: () => {
        this.project = undefined;
        this.notFound = true;
        this.loading = false;
      },
    });
  }

  loadMatching(): void {
    this.loadingMatching = true;

    this.matchingService.getMatchingResults(this.projectId).subscribe({
      next: (data) => {
        this.matchingResults = data;
        this.loadingMatching = false;
      },
      error: () => {
        this.matchingResults = [];
        this.loadingMatching = false;
      }
    });
  }

  goToPlanning(): void {
    this.router.navigate(['/my-projects', this.projectId, 'planning']);
  }

  goBack(): void {
    this.router.navigate(['/my-projects']);
  }

  formatBudget(project: ProjectCard): string {
    return `${project.minBudget.toLocaleString()} - ${project.maxBudget.toLocaleString()}`;
  }

  getCompatibility(score: number): number {
    return (score / 20) * 100;
  }

  private mapApiProject(project: ApiProject): ProjectCard {
    const budget = project.budget ?? 0;
    return {
      id: project.id,
      name: project.title?.trim() || 'Untitled project',
      clientId: 'Guest User',
      minBudget: budget,
      maxBudget: budget,
      duration: project.category || '-',
      status: this.mapApiStatus(project.status),
      createdAt: project.createdAt ? project.createdAt.slice(0, 10) : '-',
    };
  }

  private mapApiStatus(status: string | null): string {
    if (!status) return 'Unknown';

    switch (status.toUpperCase()) {
      case 'OPEN': return 'Active';
      case 'CLOSED': return 'Completed';
      default: return status;
    }
  }
}