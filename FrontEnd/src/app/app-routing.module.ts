import { NgModule } from '@angular/core';
import { adminGuard } from './core/guards/admin.guard';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  { path: '', loadChildren: () => import('./modules/home/home.module').then(m => m.HomeModule) },
  { path: 'auth', loadChildren: () => import('./modules/auth/auth.module').then(m => m.AuthModule) },
  { path: 'profile', loadChildren: () => import('./modules/profile/profile.module').then(m => m.ProfileModule) },
  { path: 'projects', loadChildren: () => import('./modules/projects/projects.module').then(m => m.ProjectsModule) },
  { path: 'my-projects', loadChildren: () => import('./modules/my-projects/my-projects.module').then(m => m.MyProjectsModule) },
  { path: 'my-offers', loadChildren: () => import('./modules/my-offers/my-offers.module').then(m => m.MyOffersModule) },
  { path: 'chatbot', loadChildren: () => import('./modules/chatbot/chatbot.module').then(m => m.ChatbotModule) },
  { path: 'freelancers', loadChildren: () => import('./modules/freelancer/freelancer.module').then(m => m.FreelancerModule) },
  { path: 'clients', loadChildren: () => import('./modules/clients/clients.module').then(m => m.ClientsModule) },
  { path: 'subscription', loadChildren: () => import('./modules/freelancer/freelancer.module').then(m => m.FreelancerModule) },
  { path: 'payment', loadChildren: () => import('./modules/payment/payment.module').then(m => m.PaymentModule) },
  { path: 'communication', loadChildren: () => import('./modules/communication/communication.module').then(m => m.CommunicationModule) },
  { path: 'feedback', loadChildren: () => import('./modules/feedback/feedback.module').then(m => m.FeedbackModule) },
  { path: 'verify/freelancer/:id', loadComponent: () => import('./modules/feedback/components/verify-reputation/verify-reputation.component').then(m => m.VerifyReputationComponent) },
  { path: 'recommendation', loadChildren: () => import('./modules/recommendation/recommendation.module').then(m => m.RecommendationModule) },
  { path: 'formation', loadChildren: () => import('./modules/formation/formation.module').then(m => m.FormationModule) },
  { path: 'events', loadChildren: () => import('./modules/events/events.module').then(m => m.EventsModule) },
  { path: 'ml-projects', loadComponent: () => import('./modules/ml-projects/ml-projects.component').then(m => m.MlProjectsComponent) },
  { path: 'admin', loadChildren: () => import('./modules/admin/admin.module').then(m => m.AdminModule), canActivate: [adminGuard] },
  { path: 'not-found', loadChildren: () => import('./modules/freelancer/freelancer.module').then(m => m.FreelancerModule) },
  { path: '**', redirectTo: '/not-found' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
