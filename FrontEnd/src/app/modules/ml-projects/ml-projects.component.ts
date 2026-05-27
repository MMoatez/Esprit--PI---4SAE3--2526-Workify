import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { MlService, MlProjectSummary } from '../../core/services/ml.service';

@Component({
  selector: 'app-ml-projects',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './ml-projects.component.html',
  styleUrls: ['./ml-projects.component.css']
})
export class MlProjectsComponent {

  category = '';
  targetBudget: number = 500;
  topN = 6;

  loading = false;
  error = '';
  results: MlProjectSummary[] = [];

  categories = [
    'Web Development', 'Mobile Development', 'Data Science',
    'Machine Learning', 'Design', 'Writing', 'Marketing',
    'SEO', 'Video', 'DevOps', 'Cybersecurity', 'Translation'
  ];

  constructor(private ml: MlService) {}

  search(): void {
    if (!this.category) return;
    this.loading = true;
    this.error = '';
    this.results = [];

    this.ml.recommend({ category: this.category, target_budget: this.targetBudget, top_n: this.topN }).subscribe({
      next: (res) => {
        this.results = res.recommendations;
        this.loading = false;
      },
      error: () => {
        this.error = 'Impossible de joindre le service ML. Vérifiez que FastAPI tourne sur le port 8085.';
        this.loading = false;
      }
    });
  }

  scorePercent(score: number): number {
    return Math.round(score * 100);
  }

  scoreColor(score: number): string {
    if (score >= 0.8) return '#10b981';
    if (score >= 0.5) return '#f59e0b';
    return '#ef4444';
  }
}
