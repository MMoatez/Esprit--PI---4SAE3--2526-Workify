import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { FreelancerProfilesComponent } from './freelancer-profiles/freelancer-profiles.component';
import { FreelancerSubscriptionComponent } from './freelancer-subscription/freelancer-subscription.component';
import { NotFoundComponent } from './not-found/not-found.component';

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
    path: '404',
    component: NotFoundComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class FreelancerRoutingModule { }