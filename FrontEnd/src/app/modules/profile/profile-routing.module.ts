import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth.guard';
import { ProfileComponent } from './profile.component';
import { CvBuilderComponent } from './cv-builder/cv-builder.component';
import { FreelancerAnalyticsComponent } from './analytics/freelancer-analytics.component';

const routes: Routes = [
  { path: '', component: ProfileComponent, canActivate: [authGuard] },
  { path: 'build-cv', component: CvBuilderComponent, canActivate: [authGuard] },
  { path: 'analytics', component: FreelancerAnalyticsComponent, canActivate: [authGuard] },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ProfileRoutingModule { }
