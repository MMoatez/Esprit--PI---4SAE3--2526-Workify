import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { FreelancerProfilesComponent } from './freelancer-profiles.component';
import { FreelancerProfileComponent } from './freelancer-profile/freelancer-profile.component';
import { FreelancerSubscriptionComponent } from './freelancer-subscription.component';
import { NotFoundComponent } from './not-found.component';

const routes: Routes = [
  {
    path: '',
    component: FreelancerProfilesComponent
  },
  {
    path: 'subscription',
    component: FreelancerSubscriptionComponent
  },
  {
    path: ':id',
    component: FreelancerProfileComponent
  },
  {
    path: 'not-found',
    component: NotFoundComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class FreelancerRoutingModule { }
