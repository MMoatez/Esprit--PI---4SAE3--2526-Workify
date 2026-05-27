import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { FreelancerRoutingModule } from './freelancer-routing.module';
import { FreelancerProfilesComponent } from './freelancer-profiles/freelancer-profiles.component';
import { FreelancerSubscriptionComponent } from './freelancer-subscription/freelancer-subscription.component';
import { NotFoundComponent } from './not-found/not-found.component';

@NgModule({
  declarations: [
    FreelancerProfilesComponent,
    FreelancerSubscriptionComponent,
    NotFoundComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    FreelancerRoutingModule
  ]
})
export class FreelancerModule { }