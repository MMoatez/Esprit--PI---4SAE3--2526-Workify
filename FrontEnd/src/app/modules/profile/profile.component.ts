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
  styles: [`
    @keyframes profFloat {
      0%, 100% { transform: translate(0, 0) scale(1); }
      33% { transform: translate(25px, -15px) scale(1.04); }
      66% { transform: translate(-15px, 10px) scale(0.96); }
    }
    @keyframes profSpin { to { transform: rotate(360deg); } }
    @keyframes profWave {
      0%, 100% { transform: rotate(0deg); }
      20%, 60% { transform: rotate(-15deg); }
      40%, 80% { transform: rotate(10deg); }
    }

    :host { display: block; }

    .prof-page {
      min-height: 100vh;
      background: linear-gradient(135deg, #f0fdfa 0%, #f8fafc 40%, #eef2ff 100%);
      position: relative;
      overflow: hidden;
    }

    /* Background Orbs */
    .prof-orb {
      position: absolute;
      border-radius: 50%;
      filter: blur(80px);
      animation: profFloat 14s ease-in-out infinite;
      pointer-events: none;
      z-index: 0;
    }
    .prof-orb--1 {
      width: 400px; height: 400px;
      background: radial-gradient(circle, rgba(13,148,136,0.12), transparent 70%);
      top: 10%; left: -5%;
    }
    .prof-orb--2 {
      width: 350px; height: 350px;
      background: radial-gradient(circle, rgba(20,184,166,0.08), transparent 70%);
      bottom: 5%; right: -5%;
      animation-delay: -5s;
    }
    .prof-orb--3 {
      width: 250px; height: 250px;
      background: radial-gradient(circle, rgba(13,148,136,0.05), transparent 70%);
      top: 50%; left: 50%; transform: translate(-50%, -50%);
      animation-delay: -9s;
    }

    /* Typography & Animations */
    .wave {
      display: inline-block;
      animation: profWave 2.5s infinite;
      transform-origin: 70% 70%;
    }

    /* Cards */
    .prof-card {
      border-radius: 2rem;
      padding: 2rem;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .prof-card--glass {
      background: rgba(255,255,255,0.75);
      backdrop-filter: blur(24px);
      -webkit-backdrop-filter: blur(24px);
      border: 1px solid rgba(255,255,255,0.5);
      box-shadow: 0 20px 60px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04);
    }
    .prof-card--dark {
      background: #0f172a;
      border: 1px solid rgba(255,255,255,0.05);
      box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);
    }
    .prof-card-bg-glow {
      position: absolute;
      top: -50px; left: 50%; transform: translateX(-50%);
      width: 150px; height: 150px;
      background: radial-gradient(circle, rgba(13,148,136,0.2), transparent 70%);
      filter: blur(20px);
      border-radius: 50%;
      pointer-events: none;
    }

    /* Avatar */
    .prof-avatar-wrapper {
      width: 160px; height: 160px;
      margin: 0 auto;
      border-radius: 2.5rem;
      background: linear-gradient(135deg, #f1f5f9, #e2e8f0);
      overflow: hidden;
      box-shadow: 0 10px 25px rgba(0,0,0,0.1), 0 0 0 6px white;
      position: relative;
    }
    .prof-avatar-img {
      width: 100%; height: 100%; object-fit: cover;
    }
    .prof-avatar-placeholder {
      width: 100%; height: 100%;
      display: flex; align-items: center; justify-content: center;
      font-size: 4rem; font-weight: 900; color: #94a3b8;
    }
    .prof-avatar-upload {
      position: absolute;
      bottom: -10px; right: -10px;
      width: 50px; height: 50px;
      background: linear-gradient(135deg, #0d9488, #0f766e);
      color: white;
      border-radius: 1.25rem;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer;
      box-shadow: 0 8px 15px rgba(13,148,136,0.3), 0 0 0 4px white;
      transition: all 0.2s ease;
      z-index: 20;
    }
    .prof-avatar-upload:hover {
      transform: scale(1.1) translateY(-2px);
      box-shadow: 0 12px 20px rgba(13,148,136,0.4), 0 0 0 4px white;
    }
    .prof-avatar-upload:active { transform: scale(0.95); }

    /* Badges */
    .prof-badge {
      display: inline-flex; align-items: center; justify-content: center;
      padding: 0.375rem 1rem;
      border-radius: 9999px;
      font-size: 0.75rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em;
    }
    .prof-badge--outline {
      background: rgba(255,255,255,0.8); backdrop-filter: blur(8px);
      border: 1px solid #e2e8f0; color: #475569;
    }
    .prof-badge--primary {
      background: #f0fdfa; color: #0d9488; box-shadow: inset 0 0 0 1px rgba(13,148,136,0.2);
    }
    .prof-badge--success {
      background: #f0fdf4; color: #15803d; box-shadow: inset 0 0 0 1px rgba(21,128,61,0.2);
    }
    .prof-badge--warning {
      background: #fffbeb; color: #b45309; box-shadow: inset 0 0 0 1px rgba(180,83,9,0.2);
    }

    /* Buttons */
    .prof-btn {
      display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem;
      padding: 0.875rem 1.5rem;
      border-radius: 1rem;
      font-size: 0.875rem; font-weight: 700;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      cursor: pointer; border: none; outline: none;
    }
    .prof-btn:disabled { opacity: 0.6; cursor: not-allowed; }
    .prof-btn--gradient {
      background: linear-gradient(135deg, #0d9488, #0f766e);
      color: white;
      box-shadow: 0 4px 15px rgba(13,148,136,0.25);
    }
    .prof-btn--gradient:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(13,148,136,0.35);
    }
    .prof-btn--gradient:active:not(:disabled) { transform: translateY(0) scale(0.98); }
    
    .prof-btn--outline {
      background: white; color: #475569;
      border: 1.5px solid #cbd5e1;
    }
    .prof-btn--outline:hover:not(:disabled) {
      background: #f8fafc; border-color: #94a3b8;
    }
    
    .prof-btn--ghost-light {
      background: rgba(255,255,255,0.08); color: white;
      border: 1px solid rgba(255,255,255,0.15);
    }
    .prof-btn--ghost-light:hover {
      background: rgba(255,255,255,0.15); border-color: rgba(255,255,255,0.25);
    }

    .prof-icon-btn {
      width: 40px; height: 40px;
      border-radius: 0.75rem;
      display: flex; align-items: center; justify-content: center;
      background: #f1f5f9; color: #64748b;
      transition: all 0.2s ease; cursor: pointer; border: none;
    }
    .prof-icon-btn:hover {
      background: #f0fdfa; color: #0d9488;
    }

    /* Details Grid */
    .prof-detail-item {
      display: flex; flex-direction: column; gap: 0.25rem;
    }
    .prof-detail-label {
      font-size: 0.6875rem; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.1em;
    }
    .prof-detail-value {
      font-size: 1rem; font-weight: 700; color: #0f172a;
    }

    /* Inputs */
    .prof-input-group { margin-bottom: 1rem; }
    .prof-label {
      display: block; font-size: 0.8125rem; font-weight: 700; color: #475569; margin-bottom: 0.5rem; margin-left: 0.25rem;
    }
    .prof-input {
      width: 100%; padding: 0.875rem 1.25rem;
      background: #f8fafc; border: 2px solid transparent; border-radius: 1rem;
      font-size: 0.875rem; font-weight: 500; color: #0f172a;
      transition: all 0.2s ease; outline: none;
    }
    .prof-input:focus {
      background: white; border-color: #14b8a6; box-shadow: 0 0 0 4px rgba(20,184,166,0.1);
    }
    .prof-input::placeholder { color: #cbd5e1; }
    .prof-input--with-icon { padding-left: 2.75rem; }
    .prof-input-icon {
      position: absolute; left: 1rem; top: 50%; transform: translateY(-50%);
      color: #94a3b8; pointer-events: none; transition: color 0.2s ease;
    }
    .relative:focus-within .prof-input-icon { color: #14b8a6; }

    /* Skills */
    .prof-skill-tag {
      display: inline-flex; align-items: center;
      padding: 0.5rem 0.75rem 0.5rem 1rem;
      background: white; border: 1.5px solid #e2e8f0; border-radius: 1rem;
      font-size: 0.8125rem; font-weight: 700; color: #334155;
      transition: all 0.2s ease;
    }
    .group:hover .prof-skill-tag {
      background: #0d9488; border-color: #0d9488; color: white;
      transform: translateY(-2px); box-shadow: 0 6px 12px rgba(13,148,136,0.2);
    }
    .prof-skill-remove {
      width: 20px; height: 20px; border-radius: 0.5rem;
      background: #f1f5f9; color: #94a3b8;
      display: flex; align-items: center; justify-content: center;
      border: none; cursor: pointer; transition: all 0.2s ease;
    }
    .group:hover .prof-skill-remove {
      background: rgba(255,255,255,0.2); color: white;
    }
    .prof-skill-remove:hover {
      background: #ef4444 !important; color: white !important;
    }

    /* Timeline */
    .prof-timeline-item {
      position: relative; padding-left: 1.75rem;
      border-left: 2px solid #f1f5f9; padding-bottom: 0.5rem;
    }
    .prof-timeline-item:last-child { border-left-color: transparent; }
    .prof-timeline-dot {
      position: absolute; left: -9px; top: 0.25rem;
      width: 16px; height: 16px; border-radius: 50%;
      border: 4px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    /* Modals */
    .prof-modal-backdrop {
      position: fixed; inset: 0; z-index: 50;
      display: flex; align-items: center; justify-content: center;
      background: rgba(15,23,42,0.6); backdrop-filter: blur(8px);
    }
    .prof-modal {
      position: relative; width: 100%; max-width: 56rem; height: 90vh;
      margin: 1rem; background: white; border-radius: 1.5rem;
      box-shadow: 0 40px 80px rgba(0,0,0,0.15); overflow: hidden;
      display: flex; flex-direction: column;
    }
    .prof-modal-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 1rem 1.5rem; border-bottom: 1px solid #f1f5f9; background: #fafbfc;
    }
    .prof-modal-close {
      width: 36px; height: 36px; border-radius: 0.75rem;
      background: white; border: 1.5px solid #e2e8f0; color: #94a3b8;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; transition: all 0.2s ease;
    }
    .prof-modal-close:hover {
      background: #fef2f2; border-color: #fecaca; color: #ef4444;
    }

    /* Utils */
    .prof-spinner {
      width: 2rem; height: 2rem; border-radius: 50%;
      border: 3px solid rgba(13,148,136,0.2); border-top-color: #0d9488;
      animation: profSpin 0.8s linear infinite;
    }
    .prof-spinner--sm {
      width: 1.25rem; height: 1.25rem; border-width: 2px;
    }
    .prof-loading {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      padding: 4rem 0; gap: 1rem; color: #64748b; font-weight: 500;
    }
    .prof-alert {
      padding: 1rem 1.25rem; border-radius: 1rem; font-size: 0.875rem; font-weight: 500;
    }
    .prof-alert--error {
      background: #fef2f2; color: #dc2626; border: 1px solid #fecaca;
    }
  `]
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
