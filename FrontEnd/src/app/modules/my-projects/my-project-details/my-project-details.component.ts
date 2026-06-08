import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiProject, ProjectDetailsView, ProjectFile, ProjectMember } from '../../../core/models/my-project.model';
import { MyProjectsService } from '../../../core/services/my-projects.service';
import { OffersService } from '../../../core/services/offers.service';
import { MyOffer, OfferStatus } from '../../../core/models/my-offer.model';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  standalone: false,
  selector: 'app-my-project-details',
  templateUrl: './my-project-details.component.html',
  styleUrls: ['./my-project-details.component.css'],
})
export class MyProjectDetailsComponent implements OnInit {

  project: ProjectDetailsView | null = null;
  projectFiles: ProjectFile[] = [];
  loading = true;
  error = '';
  isGeneratingTasks = false;

  isUploadingFile = false;
  selectedFile: File | null = null;
  showFileUploadModal = false;

  currentUserId = 0;
  currentUserRole = '';
  isFreelancer = false;
  isClient = false;

  projectId = 0;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private myProjectsService: MyProjectsService,
    private offersService: OffersService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.currentUserId = this.authService.getNumericUserId() ?? 0;
    this.currentUserRole = (this.authService.getCurrentRole() ?? '').toUpperCase();
    this.isFreelancer = this.currentUserRole === 'FREELANCER';
    this.isClient = this.currentUserRole === 'CLIENT';

    this.route.params.subscribe((params) => {
      this.projectId = +params['id'];
      this.loadProject();
      this.loadProjectFiles(this.projectId);
    });
  }

  loadProject(): void {
    this.loading = true;
    this.error = '';

    this.myProjectsService.getProjectById(this.projectId).subscribe({
      next: (apiProject) => {
        this.project = this.mapApiProject(apiProject);
        this.loadFreelancerForProject(this.projectId);
        this.loading = false;
      },
      error: () => {
        this.project = null;
        this.error = 'Failed to load project';
        this.loading = false;
      },
    });
  }

  private loadFreelancerForProject(projectId: number): void {
    this.offersService.getOffersByProject(projectId).subscribe({
      next: (offers: MyOffer[]) => {
        if (!this.project) {
          return;
        }

        const selected = offers.find((o) => o.status === OfferStatus.ACCEPTED || o.status === OfferStatus.COMPLETED)
          ?? offers[0];

        if (selected?.freelancer) {
          this.project.freelancer = this.toMember(
            selected.freelancer.id,
            selected.freelancer.nom,
            selected.freelancer.email
          );
        }
      },
      error: () => {}
    });
  }

  loadProjectFiles(projectId: number): void {
    this.myProjectsService.getProjectFiles(projectId).subscribe({
      next: (files) => {
        this.projectFiles = files;
      },
      error: () => {
        this.projectFiles = [];
      }
    });
  }

  openFileUploadModal(): void {
    this.showFileUploadModal = true;
    this.selectedFile = null;
  }

  closeFileUploadModal(): void {
    this.showFileUploadModal = false;
    this.selectedFile = null;
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedFile = input.files?.[0] ?? null;
  }

  uploadFile(): void {
    if (!this.selectedFile || !this.projectId) {
      return;
    }

    if (this.selectedFile.size > 50 * 1024 * 1024) {
      this.error = 'File too large. Maximum is 50MB.';
      return;
    }

    this.isUploadingFile = true;
    this.myProjectsService.uploadFile(this.projectId, this.selectedFile, this.currentUserId).subscribe({
      next: (uploaded) => {
        this.projectFiles = [uploaded, ...this.projectFiles];
        this.isUploadingFile = false;
        this.closeFileUploadModal();
      },
      error: () => {
        this.isUploadingFile = false;
        this.error = 'Error uploading file.';
      }
    });
  }

  downloadFile(file: ProjectFile): void {
    this.myProjectsService.downloadFile(file.id).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = file.originalFileName;
        link.click();
        window.URL.revokeObjectURL(url);
      },
      error: () => {
        this.error = 'Error downloading file.';
      }
    });
  }

  deleteFile(file: ProjectFile): void {
    this.myProjectsService.deleteFile(file.id).subscribe({
      next: () => {
        this.projectFiles = this.projectFiles.filter((f) => f.id !== file.id);
      },
      error: () => {
        this.error = 'Error deleting file.';
      }
    });
  }

  generateTasksWithAI(): void {
    if (!this.projectId) {
      return;
    }

    this.isGeneratingTasks = true;
    this.myProjectsService.generateTasksWithAI(this.projectId).subscribe({
      next: (response) => {
        this.isGeneratingTasks = false;
        this.error = '';
        alert(response?.message || 'Tasks generated successfully.');
      },
      error: (err) => {
        this.isGeneratingTasks = false;
        this.error = err?.error?.message || 'Failed to generate tasks with AI.';
      }
    });
  }

  openPlanningBoard(): void {
    this.router.navigate(['/my-projects', this.projectId, 'planning']);
  }

  goBack(): void {
    this.router.navigate(['/my-projects']);
  }

  formatFileSize(bytes: number): string {
    if (!bytes) return '0 Bytes';
    const units = ['Bytes', 'KB', 'MB', 'GB'];
    const index = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${Math.round((bytes / Math.pow(1024, index)) * 100) / 100} ${units[index]}`;
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getFileIcon(fileType: string): string {
    const type = (fileType || '').toLowerCase();
    if (type.includes('image')) return 'IMG';
    if (type.includes('pdf')) return 'PDF';
    if (type.includes('word') || type.includes('document')) return 'DOC';
    if (type.includes('excel') || type.includes('spreadsheet')) return 'XLS';
    if (type.includes('zip') || type.includes('rar') || type.includes('compressed')) return 'ZIP';
    if (type.includes('video')) return 'VID';
    if (type.includes('audio')) return 'AUD';
    return 'FILE';
  }

  private mapApiProject(project: ApiProject): ProjectDetailsView {
    return {
      id: project.id ?? 0,
      name: project.title?.trim() || 'Untitled project',
      description: project.detailedDescription?.trim() || project.shortDescription?.trim() || 'No description available for this project.',
      client: this.toMember(project.clientId ?? undefined, project.clientName, project.clientEmail),
      freelancer: null,
    };
  }

  private toMember(id: number | undefined, fullName: string | null | undefined, email: string | null | undefined): ProjectMember | null {
    const normalizedName = (fullName ?? '').trim();
    const normalizedEmail = (email ?? '').trim();
    if (!normalizedName && !normalizedEmail) {
      return null;
    }

    const parts = normalizedName ? normalizedName.split(' ') : [];
    const firstName = parts[0] || 'User';
    const lastName = parts.slice(1).join(' ') || '';

    return {
      id,
      firstName,
      lastName,
      email: normalizedEmail || 'unknown@workify.com'
    };
  }
}