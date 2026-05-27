import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { OffersService } from '../../../services/offers.service';
import { MyOffer } from '../../../models/my-offer.model';

@Component({
  selector: 'app-create-offer',
  templateUrl: './create-offer.component.html',
  styleUrls: ['./create-offer.component.css']
})
export class CreateOfferComponent implements OnInit {

  projectId!: number;
  freelancerId = 40; // ⚠️ temporaire (remplacer par auth plus tard)

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
    private offersService: OffersService
  ) {}

  ngOnInit(): void {

    this.route.params.subscribe(params => {

      const id = params['projectId'];

      if (!id) {
        console.error('Project ID missing in route');
        return;
      }

      this.projectId = Number(id);
      console.log('Project ID:', this.projectId);
    });
  }

  submitOffer(): void {

    if (!this.projectId) {
      this.error = 'Invalid project ID';
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