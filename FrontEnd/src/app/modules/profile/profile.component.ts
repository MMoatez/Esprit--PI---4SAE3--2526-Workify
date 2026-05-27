import { Component, OnInit, HostListener } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { UserProfileService } from '../../core/services/user-profile.service';
import type { UserProfile, CompetenceDto } from '../../core/models/user-profile.model';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

import { CommonModule, UpperCasePipe } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

@Component({
  standalone: true,
  imports: [CommonModule, UpperCasePipe, ReactiveFormsModule, FormsModule, RouterModule],
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss'],
})
export class ProfileComponent implements OnInit {
  profile: UserProfile | null = null;
  loading = true;
  error: string | null = null;
  editForm!: FormGroup;
  editing = false;
  saving = false;
  avatarUploading = false;
  newCompetence = '';
  addingCompetence = false;
  showResumeModal = false;
  showCvBuilder = false;
  safeCvBuilderUrl: SafeResourceUrl;

  constructor(
    private profileService: UserProfileService,
    private fb: FormBuilder,
    private sanitizer: DomSanitizer,
  ) {
    this.safeCvBuilderUrl = this.sanitizer.bypassSecurityTrustResourceUrl('http://localhost:3000');
  }

  ngOnInit(): void {
    this.editForm = this.fb.group({
      firstName: ['', [Validators.maxLength(100)]],
      lastName: ['', [Validators.maxLength(100)]],
      phone: ['', [Validators.maxLength(30)]],
      rib: ['', [Validators.maxLength(100)]],
    });
    this.loadProfile();
  }

  loadProfile(): void {
    this.loading = true;
    this.error = null;
    this.profileService.getMe().subscribe({
      next: (p) => {
        this.profile = p;
        this.editForm.patchValue({
          firstName: p.firstName ?? '',
          lastName: p.lastName ?? '',
          phone: p.phone ?? '',
          rib: p.rib ?? '',
        });
        this.loading = false;
      },
      error: (err) => {
        this.error = err?.error?.message || 'Unable to load profile';
        this.loading = false;
      },
    });
  }

  get avatarUrl(): string | null {
    if (!this.profile?.profilePicture) return null;
    return this.profileService.getAvatarUrl(this.profile.profilePicture);
  }

  toggleEdit(): void {
    this.editing = !this.editing;
  }

  saveProfile(): void {
    if (!this.profile || this.editForm.invalid) return;
    this.saving = true;
    this.profileService.updateMe(this.editForm.value).subscribe({
      next: (p) => {
        this.profile = p;
        this.editing = false;
        this.saving = false;
      },
      error: () => {
        this.saving = false;
      },
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    this.avatarUploading = true;
    this.profileService.uploadAvatar(file).subscribe({
      next: (p) => {
        this.profile = p;
        this.avatarUploading = false;
        input.value = '';
      },
      error: () => {
        this.avatarUploading = false;
      },
    });
  }

  addCompetence(): void {
    const name = this.newCompetence?.trim();
    if (!name || this.addingCompetence) return;
    this.addingCompetence = true;
    this.profileService.addCompetence(name).subscribe({
      next: (c) => {
        if (this.profile) {
          this.profile = {
            ...this.profile,
            competences: [...this.profile.competences, c],
          };
        }
        this.newCompetence = '';
        this.addingCompetence = false;
      },
      error: () => {
        this.addingCompetence = false;
      },
    });
  }

  removeCompetence(c: CompetenceDto): void {
    if (!this.profile) return;
    this.profileService.removeCompetence(c.id).subscribe({
      next: () => {
        this.profile = {
          ...this.profile!,
          competences: this.profile!.competences.filter((x) => x.id !== c.id),
        };
      },
    });
  }

  get cvPdfUrl(): string | null {
    return this.profileService.getCvPdfUrl(this.profile?.cvPdf ?? null);
  }

  get safeCvPdfUrl(): SafeResourceUrl | null {
    const url = this.cvPdfUrl;
    if (!url) return null;
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  viewResume(): void {
    if (this.cvPdfUrl) {
      this.showResumeModal = true;
    }
  }

  closeResumeModal(): void {
    this.showResumeModal = false;
  }

  openCvBuilder(): void {
    this.showCvBuilder = true;
  }

  closeCvBuilder(): void {
    this.showCvBuilder = false;
  }

  isSavingCv = false;

  @HostListener('window:message', ['$event'])
  onCvBuilderMessage(event: MessageEvent): void {
    if (event.origin !== 'http://localhost:3000') return;
    if (event.data && event.data.type === 'OPENRESUME_EXPORT') {
      const resumeData = event.data.payload;
      const pdfBase64: string | null = event.data.pdfBase64 || null;
      console.log('CV builder export received, saving to backend...', resumeData);
      this.handleResumeSync(resumeData, pdfBase64);
    }
  }

  private handleResumeSync(resumeData: any, pdfBase64: string | null): void {
    if (this.isSavingCv) return;
    this.isSavingCv = true;

    // 1. Import the JSON data (skills, experience, education)
    this.profileService.importCv(resumeData).subscribe({
      next: () => {
        console.log('CV data saved successfully');
        // 2. If we have a PDF, upload it too
        if (pdfBase64) {
          this.uploadCvPdf(pdfBase64);
        } else {
          this.isSavingCv = false;
          this.closeCvBuilder();
          this.loadProfile();
        }
      },
      error: (err) => {
        console.error('Failed to sync CV data', err);
        alert('There was an error saving your CV data to Workify.');
        this.isSavingCv = false;
      },
    });
  }

  private uploadCvPdf(pdfBase64: string): void {
    // Convert base64 to a File object
    const byteString = atob(pdfBase64);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    const blob = new Blob([ab], { type: 'application/pdf' });
    const file = new File([blob], 'resume.pdf', { type: 'application/pdf' });

    this.profileService.uploadCvPdf(file).subscribe({
      next: () => {
        console.log('CV PDF uploaded successfully');
        this.isSavingCv = false;
        this.closeCvBuilder();
        this.loadProfile(); // Reload profile to show updated data
      },
      error: (err) => {
        console.error('Failed to upload CV PDF', err);
        alert('CV data was saved, but PDF upload failed.');
        this.isSavingCv = false;
        this.closeCvBuilder();
        this.loadProfile();
      },
    });
  }
}
