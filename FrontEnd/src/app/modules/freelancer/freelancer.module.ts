import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { FreelancerRoutingModule } from './freelancer-routing.module';
import { FreelancerProfilesComponent } from './freelancer-profiles.component';
import { FreelancerProfileComponent } from './freelancer-profile/freelancer-profile.component';
import { FreelancerSubscriptionComponent } from './freelancer-subscription.component';
import { NotFoundComponent } from './not-found.component';

@NgModule({
  declarations: [
    FreelancerProfilesComponent,
    FreelancerSubscriptionComponent,
    NotFoundComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    FreelancerRoutingModule,
    FreelancerProfileComponent
  ]
})
export class FreelancerModule { }
