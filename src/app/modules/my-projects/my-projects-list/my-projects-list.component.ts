import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import {
  ApiProject,
  MyProject,
  ProjectStatus,
  ProjectCategory,
} from '../../../models/my-project.model';
import { MyProjectsService } from '../../../services/my-projects.service';

type ProjectCard = MyProject & {
  clientId: string;
  minBudget: number;
  maxBudget: number;
  duration: string;
  status: string;
  createdAt: string;
  title?: string;
  shortDescription?: string;
  detailedDescription?: string;
  category?: string;
  estimatedDuration?: number | null;
  complexity?: string | null;
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
};

@Component({
  selector: 'app-my-projects-list',
  templateUrl: './my-projects-list.component.html',
  styleUrls: ['./my-projects-list.component.css'],
})
export class MyProjectsListComponent implements OnInit {
  projects: ProjectCard[] = [];
  filteredProjects: ProjectCard[] = [];
  loading = true;
  error = '';
  formError = '';
  showForm = false;
  showCreateModeModal = false;
  isEditing = false;
  formModel: ProjectCard = this.getEmptyForm();
  confirmDeleteOpen = false;
  pendingDelete: ProjectCard | null = null;
  private nextId = 1;
  createMode: 'auto' | 'manual' | null = null;
  complexityOptions = ['LOW', 'MEDIUM', 'HIGH'];

  // Filter State
  searchQuery = '';
  selectedCategory: string | null = null;
  selectedStatus: string | null = null;
  showMobileFilters = false;

  // Enum options
  statuses = Object.values(ProjectStatus);
  categories = Object.values(ProjectCategory);

  constructor(
    private router: Router,
    private myProjectsService: MyProjectsService,
  ) {}

  ngOnInit(): void {
    this.loadProjects();
  }

  loadProjects(): void {
    this.loading = true;
    this.myProjectsService.getAllProjects().subscribe({
      next: (projects) => {
        this.projects = projects.map((project) => this.mapApiProject(project));
        this.nextId =
          this.projects.reduce(
            (maxId, project) => Math.max(maxId, project.id ?? 0),
            0,
          ) + 1;
        this.error = '';
        this.loading = false;
        this.applyFilters();
      },
      error: () => {
        this.error = 'Failed to load projects. Please try again.';
        this.projects = [];
        this.filteredProjects = [];
        this.loading = false;
      },
    });
  }

  // Filtering Logic
  applyFilters(): void {
    this.filteredProjects = this.projects.filter((project) => {
      // Search filter
      const searchLower = this.searchQuery.toLowerCase();
      const matchesSearch =
        !this.searchQuery ||
        project.name.toLowerCase().includes(searchLower) ||
        project.clientId.toLowerCase().includes(searchLower) ||
        (project.title && project.title.toLowerCase().includes(searchLower)) ||
        (project.category &&
          project.category.toLowerCase().includes(searchLower)) ||
        (project.clientName &&
          project.clientName.toLowerCase().includes(searchLower));

      // Category filter - match against duration field which contains category
      const matchesCategory =
        !this.selectedCategory || project.duration === this.selectedCategory;

      // Status filter
      const matchesStatus =
        !this.selectedStatus || project.status === this.selectedStatus;

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }

  onSearchChange(): void {
    this.applyFilters();
  }

  onCategoryChange(): void {
    this.applyFilters();
  }

  onStatusChange(): void {
    this.applyFilters();
  }

  clearFilters(): void {
    this.searchQuery = '';
    this.selectedCategory = null;
    this.selectedStatus = null;
    this.applyFilters();
  }

  hasActiveFilters(): boolean {
    return !!(this.searchQuery || this.selectedCategory || this.selectedStatus);
  }

  toggleMobileFilters(): void {
    this.showMobileFilters = !this.showMobileFilters;
  }

  getProjectCountByCategory(category: string): number {
    return this.projects.filter((project) => project.duration === category)
      .length;
  }

  viewProjectDetails(projectId: number | undefined): void {
    if (projectId) {
      this.router.navigate(['/my-projects', projectId]);
    }
  }

  openCreateForm(): void {
    this.showCreateModeModal = true;
    this.isEditing = false;
    this.createMode = null;
    this.formModel = this.getEmptyForm();
    this.formError = '';
  }

  selectCreateMode(mode: 'auto' | 'manual'): void {
    this.createMode = mode;
    this.showCreateModeModal = false;
    this.showForm = true;
  }

  closeCreateModeModal(): void {
    this.showCreateModeModal = false;
    this.createMode = null;
  }

  openEditForm(project: ProjectCard, event?: MouseEvent): void {
    if (event) {
      event.stopPropagation();
    }
    this.showForm = true;
    this.isEditing = true;
    this.createMode = 'manual';
    this.formModel = { ...project };
    this.formError = '';
  }

  cancelForm(): void {
    this.showForm = false;
    this.isEditing = false;
    this.formModel = this.getEmptyForm();
    this.formError = '';
    this.createMode = null;
  }

  /*submitForm(): void {
    const errors: string[] = [];

    // Validation for required fields
    if (!this.formModel.title?.trim()) {
      errors.push('Project Title is required');
    }
    if (!this.formModel.shortDescription?.trim()) {
      errors.push('Short Description is required');
    }
    if (!this.formModel.category?.trim()) {
      errors.push('Category is required');
    }
    if (!this.formModel.detailedDescription?.trim()) {
      errors.push('Detailed Description is required');
    }
    if (!this.formModel.clientName?.trim()) {
      errors.push('Client Name is required');
    }
    if (!this.formModel.clientEmail?.trim()) {
      errors.push('Client Email is required');
    }
    if (this.createMode === 'manual' && !this.isEditing) {
      if (!this.formModel.estimatedDuration) {
        errors.push('Estimated Duration is required');
      }
      if (!this.formModel.complexity?.trim()) {
        errors.push('Complexity is required');
      }
    }

    // Show validation errors
    if (errors.length > 0) {
      this.formError = `Please fill in all required fields:\n• ${errors.join('\n• ')}`;
      return;
    }

    const apiProjectData: ApiProject = {
      id: this.formModel.id ?? 0,
      title: this.formModel.title ?? null,
      shortDescription: this.formModel.shortDescription || null,
      detailedDescription: this.formModel.detailedDescription || null,
      category: this.formModel.category || null,
      budget: this.formModel.minBudget || null,
      estimatedDuration:
        this.createMode === 'manual'
          ? (this.formModel.estimatedDuration ?? null)
          : null,
      complexity:
        this.createMode === 'manual'
          ? (this.formModel.complexity ?? null)
          : null,
      clientName: this.formModel.clientName || null,
      clientEmail: this.formModel.clientEmail || null,
      clientPhone: this.formModel.clientPhone || null,
      clientId: null,
      createdAt: null,
      status: this.formModel.status || null,
    };

    const createRequest =
      this.createMode === 'auto'
        ? this.myProjectsService.createProjectAuto(apiProjectData)
        : this.myProjectsService.createProject(apiProjectData);

    createRequest.subscribe({
      next: (createdProject) => {
        this.loadProjects();
        this.cancelForm();
      },
      error: (err) => {
        this.error = 'Failed to create project. Please try again.';
        this.cancelForm();
      },
    });
  }*/
submitForm(): void {
  const errors: string[] = [];

  // Validation pour les champs obligatoires
  if (!this.formModel.title?.trim()) {
    errors.push('Project Title is required');
  }
  if (!this.formModel.shortDescription?.trim()) {
    errors.push('Short Description is required');
  }
  if (!this.formModel.category?.trim()) {
    errors.push('Category is required');
  }
  if (!this.formModel.detailedDescription?.trim()) {
    errors.push('Detailed Description is required');
  }
  if (!this.formModel.clientName?.trim()) {
    errors.push('Client Name is required');
  }
  if (!this.formModel.clientEmail?.trim()) {
    errors.push('Client Email is required');
  }
  if (this.createMode === 'manual' && !this.isEditing) {
    if (!this.formModel.estimatedDuration) {
      errors.push('Estimated Duration is required');
    }
    if (!this.formModel.complexity?.trim()) {
      errors.push('Complexity is required');
    }
  }

  // Afficher les erreurs si présentes
  if (errors.length > 0) {
    this.formError = `Please fill in all required fields:\n• ${errors.join('\n• ')}`;
    return;
  }

  // Construire l'objet à envoyer au backend
  const apiProjectData: ApiProject = {
    id: this.formModel.id ?? 0,
    title: this.formModel.title ?? null,
    shortDescription: this.formModel.shortDescription || null,
    detailedDescription: this.formModel.detailedDescription || null,
    category: this.formModel.category || null,
    budget: this.formModel.minBudget || null,
    estimatedDuration:
      this.createMode === 'manual'
        ? (this.formModel.estimatedDuration ?? null)
        : null,
    complexity:
      this.createMode === 'manual'
        ? (this.formModel.complexity ?? null)
        : null,
    clientName: this.formModel.clientName || null,
    clientEmail: this.formModel.clientEmail || null,
    clientPhone: this.formModel.clientPhone || null,
    clientId: null, // ⚠️ statique côté front, pas envoyé au backend
    createdAt: null,
    status: this.formModel.status || null,
  };

  // Choisir entre création et mise à jour
  const request = this.isEditing
    ? this.myProjectsService.updateProject(apiProjectData.id!, apiProjectData)
    : (this.createMode === 'auto'
        ? this.myProjectsService.createProjectAuto(apiProjectData)
        : this.myProjectsService.createProject(apiProjectData));

  request.subscribe({
    next: () => {
      this.loadProjects();
      this.cancelForm();
    },
    error: () => {
      this.error = this.isEditing
        ? 'Failed to update project. Please try again.'
        : 'Failed to create project. Please try again.';
      this.cancelForm();
    },
  });
}

  openDeleteConfirm(project: ProjectCard, event?: MouseEvent): void {
    if (event) {
      event.stopPropagation();
    }
    this.pendingDelete = project;
    this.confirmDeleteOpen = true;
  }

  closeDeleteConfirm(): void {
    this.pendingDelete = null;
    this.confirmDeleteOpen = false;
  }

  confirmDelete(): void {
    if (!this.pendingDelete) {
      return;
    }
    this.projects = this.projects.filter(
      (project) => project.id !== this.pendingDelete?.id,
    );
    this.applyFilters();
    this.closeDeleteConfirm();
  }

  formatBudget(project: ProjectCard): string {
    return `${project.minBudget.toLocaleString()} - ${project.maxBudget.toLocaleString()}`;
  }

  private mapApiProject(project: ApiProject): ProjectCard {
    const budget = project.budget ?? 0;
    return {
      id: project.id,
      name: project.title?.trim() || 'Untitled project',
      clientId: project.clientId
        ? `CL-${project.clientId}`
        : project.clientName || '-',
      minBudget: budget,
      maxBudget: budget,
      duration: project.category || '-',
      status: this.mapApiStatus(project.status),
      createdAt: project.createdAt ? project.createdAt.slice(0, 10) : '-',
      title: project.title || '',
      shortDescription: project.shortDescription || '',
      detailedDescription: project.detailedDescription || '',
      category: project.category || '',
      estimatedDuration: project.estimatedDuration ?? null,
      complexity: project.complexity ?? null,
      clientName: project.clientName || '',
      clientEmail: project.clientEmail || '',
      clientPhone: project.clientPhone || '',
    };
  }

  private mapApiStatus(status: string | null): string {
    if (!status) {
      return 'Unknown';
    }
    switch (status.toUpperCase()) {
      case 'OPEN':
        return 'Active';
      case 'CLOSED':
        return 'Completed';
      default:
        return status;
    }
  }

  private getEmptyForm(): ProjectCard {
    return {
      name: '',
      clientId: '',
      minBudget: 0,
      maxBudget: 0,
      duration: '',
      status: ProjectStatus.OPEN,
      createdAt: new Date().toISOString().slice(0, 10),
      title: '',
      shortDescription: '',
      detailedDescription: '',
      category: ProjectCategory.AUTRE,
      estimatedDuration: null,
      complexity: null,
      clientName: '',
      clientEmail: '',
      clientPhone: '',
    };
  }
}
