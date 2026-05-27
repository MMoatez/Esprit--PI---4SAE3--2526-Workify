import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { projects, categories, Project } from '../../../../data/mockData';

@Component({
  selector: 'app-browse-projects',
  standalone: false,
  templateUrl: './browse-projects.component.html',
  styleUrls: ['./browse-projects.component.scss']
})
export class BrowseProjectsComponent implements OnInit {
  searchTerm: string = '';
  selectedCategory: string = 'All Categories';
  budgetRange: [number, number] = [0, 20000];
  sortBy: 'recent' | 'budget' | 'proposals' = 'recent';
  
  categories = categories;
  projectsWithScores: (Project & { matchScore: number })[] = [];
  filteredProjects: (Project & { matchScore: number })[] = [];

  constructor(private router: Router) {}

  ngOnInit(): void {
    // Demo/mock data: Generate random match scores for prototype
    this.projectsWithScores = projects.map(project => ({
      ...project,
      matchScore: Math.floor(Math.random() * 30) + 70
    }));
    this.filterAndSortProjects();
  }

  onSearchChange(): void {
    this.filterAndSortProjects();
  }

  onCategoryChange(category: string): void {
    this.selectedCategory = category;
    this.filterAndSortProjects();
  }

  onBudgetChange(value: number): void {
    this.budgetRange = [this.budgetRange[0], value];
    this.filterAndSortProjects();
  }

  onSortChange(): void {
    this.filterAndSortProjects();
  }

  filterAndSortProjects(): void {
    let filtered = this.projectsWithScores.filter(project => {
      const matchesSearch =
        project.title.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        project.description.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        project.skills.some(skill =>
          skill.toLowerCase().includes(this.searchTerm.toLowerCase())
        );

      const matchesCategory =
        this.selectedCategory === 'All Categories' || project.category === this.selectedCategory;

      const matchesBudget =
        project.budget.max >= this.budgetRange[0] && project.budget.min <= this.budgetRange[1];

      return matchesSearch && matchesCategory && matchesBudget;
    });

    if (this.sortBy === 'budget') {
      filtered.sort((a, b) => b.budget.max - a.budget.max);
    } else if (this.sortBy === 'proposals') {
      filtered.sort((a, b) => a.proposals - b.proposals);
    } else {
      filtered.sort(
        (a, b) => new Date(b.postedDate).getTime() - new Date(a.postedDate).getTime()
      );
    }

    this.filteredProjects = filtered;
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return 'Today';
    if (diffDays === 2) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  }

  navigateToProject(projectId: string): void {
    this.router.navigate(['/projects', projectId]);
  }
}
