import { Component, OnInit, HostListener } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { UserProfileService } from '../../../core/services/user-profile.service';

@Component({
  selector: 'app-cv-builder',
  standalone: false,
  templateUrl: './cv-builder.component.html',
  styleUrl: './cv-builder.component.scss'
})
export class CvBuilderComponent implements OnInit {
  iframeUrl: SafeResourceUrl | undefined;
  isSaving = false;

  constructor(
    private sanitizer: DomSanitizer,
    private profileService: UserProfileService
  ) { }

  ngOnInit(): void {
    this.iframeUrl = this.sanitizer.bypassSecurityTrustResourceUrl('http://localhost:3000');
  }

  @HostListener('window:message', ['$event'])
  onMessage(event: MessageEvent) {
    if (event.origin !== 'http://localhost:3000') return;

    if (event.data && event.data.type === 'OPENRESUME_EXPORT') {
      const resumeData = event.data.payload;
      const pdfBase64: string | null = event.data.pdfBase64 || null;
      console.log('Received resume data from OpenResume:', resumeData);
      this.handleResumeSync(resumeData, pdfBase64);
    }
  }

  private handleResumeSync(resumeData: any, pdfBase64: string | null) {
    if (this.isSaving) return;
    this.isSaving = true;

    // 1. Import the JSON data first
    this.profileService.importCv(resumeData).subscribe({
      next: () => {
        // 2. If we have a PDF, upload it too
        if (pdfBase64) {
          this.uploadPdf(pdfBase64);
        } else {
          alert('Your CV data was successfully saved to your Workify Profile!');
          this.isSaving = false;
        }
      },
      error: (err) => {
        console.error('Failed to sync CV data', err);
        alert('There was an error saving your CV data to Workify.');
        this.isSaving = false;
      }
    });
  }

  private uploadPdf(pdfBase64: string) {
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
        alert('Your CV data and PDF were successfully saved to your Workify Profile!');
        this.isSaving = false;
      },
      error: (err) => {
        console.error('Failed to upload CV PDF', err);
        alert('CV data was saved, but PDF upload failed.');
        this.isSaving = false;
      }
    });
  }
}
