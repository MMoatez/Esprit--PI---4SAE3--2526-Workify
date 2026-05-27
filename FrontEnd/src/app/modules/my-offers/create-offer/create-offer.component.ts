import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { OffersService } from '../../../core/services/offers.service';
import { MyOffer } from '../../../core/models/my-offer.model';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  standalone: false,
  selector: 'app-create-offer',
  templateUrl: './create-offer.component.html',
  styleUrls: ['./create-offer.component.css']
})
export class CreateOfferComponent implements OnInit {

  projectId!: number;
  freelancerId: number | null = null;

  isSubmitting = false;
  error: string | null = null;

  offer: Partial<MyOffer> = {
    message: '',
    price: null,
    duration: null
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private offersService: OffersService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      const id = params['projectId'];
      if (!id) { return; }
      this.projectId = Number(id);
    });

    if (this.authService.getRole() === 'FREELANCER') {
      const email  = this.authService.getUserEmail();
      const name   = this.authService.getUserName();
      const userId = this.authService.getNumericUserId() ?? 0;
      if (email && name) {
        this.offersService.syncFreelancer(userId, name, email).subscribe({
          next: (f) => { this.freelancerId = f.id; },
          error: () => {}
        });
      }
    }
  }

  submitOffer(): void {

    if (!this.projectId) {
      this.error = 'Invalid project ID';
      return;
    }

    if (!this.freelancerId) {
      this.error = 'Could not identify your freelancer account. Please try again.';
      return;
    }

    if (!this.offer.message || !this.offer.price) {
      this.error = 'Please fill all required fields';
      return;
    }

    this.isSubmitting = true;
    this.error = null;

    this.offersService
      .createOffer(this.projectId, this.freelancerId, this.offer)
      .subscribe({
        next: () => {
          this.router.navigate(['/my-offers']);
        },
        error: (err) => {
          console.error('Submit error:', err);
          this.error = 'Failed to submit offer';
          this.isSubmitting = false;
        }
      });
  }

  cancel(): void {
    this.router.navigate(['/projects/open']);
  }
}