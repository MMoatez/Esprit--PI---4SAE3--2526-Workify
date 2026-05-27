import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-not-found',
  templateUrl: './not-found.component.html',
  styleUrls: ['./not-found.component.css']
})
export class NotFoundComponent {
  
  constructor(private router: Router) {}

  goHome(): void {
    this.router.navigate(['/']);
  }

  goBack(): void {
    window.history.back();
  }

  browseProjects(): void {
    this.router.navigate(['/projects']);
  }

  findFreelancers(): void {
    this.router.navigate(['/freelancers']);
  }

  goToSubscription(): void {
    this.router.navigate(['/freelancers/subscription']);
  }

  contactSupport(): void {
    // Logique pour contacter le support
    console.log('Contact support');
  }
}