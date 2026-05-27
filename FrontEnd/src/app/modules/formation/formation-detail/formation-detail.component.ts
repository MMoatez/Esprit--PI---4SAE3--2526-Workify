import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormationService, Formation, Domain, Review } from '../formation/formation.service';
import { AuthService } from '../../../core/services/auth.service';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-formation-detail',
  standalone: false,
  templateUrl: './formation-detail.component.html',
  styleUrls: ['./formation-detail.component.scss']
})
export class FormationDetailComponent implements OnInit {
  formation: Formation | null = null;
  enrollment: any | null = null;
  loading = true;
  error: string | null = null;
  reviews: Review[] = [];
  averageRating: number = 0;

  constructor(
    private route: ActivatedRoute,
    private formationService: FormationService,
    private router: Router,
    private authService: AuthService,
    private sanitizer: DomSanitizer
  ) { }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadFormation(+id);
    } else {
      this.error = 'Formation not found.';
      this.loading = false;
    }
  }

  loadFormation(id: number): void {
    this.formationService.getFormationById(id).subscribe({
      next: (data) => {
        this.formation = data;
        this.checkEnrollment(id);
        this.loadReviews(id);
      },
      error: (err) => {
        console.error('Error loading formation', err);
        this.error = 'Unable to load course details.';
        this.loading = false;
      }
    });
  }

  checkEnrollment(id: number): void {
    this.formationService.checkEnrollment(id).subscribe({
      next: (enrollment) => {
        this.enrollment = enrollment;
        this.loading = false;
      },
      error: () => {
        this.enrollment = null;
        this.loading = false;
      }
    });
  }

  enroll(): void {
    console.log('Enroll button clicked');
    if (!this.authService.isLoggedIn()) {
      console.log('User not logged in, redirecting...');
      this.router.navigate(['/auth/login'], { queryParams: { returnUrl: this.router.url } });
      return;
    }

    if (!this.formation?.id) {
      console.warn('No formation id');
      return;
    }

    console.log('Enrolling in formation:', this.formation.id);
    this.formationService.enroll(this.formation.id).subscribe({
      next: (enrollment) => {
        console.log('Enrollment success:', enrollment);
        this.enrollment = enrollment;
        this.router.navigate(['/formation', this.formation?.id, 'play']);
      },
      error: (err) => {
        console.error('Enrollment error details:', err);
        if (err.status === 401) {
          this.router.navigate(['/auth/login']);
        } else {
          alert('An error occurred during enrollment: ' + (err.error?.message || 'Unknown error'));
        }
      }
    });
  }

  continueLearning(): void {
    if (this.formation?.id) {
      this.router.navigate(['/formation', this.formation.id, 'play']);
    }
  }

  getDomainColor(domain: Domain): string {
    switch (domain) {
      case Domain.IT: return 'bg-blue-100 text-blue-700';
      case Domain.MARKETING: return 'bg-pink-100 text-pink-700';
      case Domain.DESIGN_CREATION: return 'bg-purple-100 text-purple-700';
      case Domain.SECURITY_NETWORK: return 'bg-red-100 text-red-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  }

  goBack(): void {
    this.router.navigate(['/formation']);
  }

  loadReviews(id: number): void {
    this.formationService.getReviews(id).subscribe({
      next: (reviews) => this.reviews = reviews,
      error: (err) => console.error('Error loading reviews', err)
    });
    this.formationService.getAverageRating(id).subscribe({
      next: (avg) => this.averageRating = avg,
      error: (err) => console.error('Error loading average rating', err)
    });
  }

  getLocationMapUrl(): SafeResourceUrl | null {
    if (!this.formation?.address || this.formation.status !== 'ON_SITE') return null;
    const encodedAddress = encodeURIComponent(this.formation.address);
    const url = `https://maps.google.com/maps?q=${encodedAddress}&output=embed`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }
}
