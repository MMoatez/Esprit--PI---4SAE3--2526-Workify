import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ChatbotComponent } from './modules/chatbot/chatbot.component';
import { RecommendationComponent } from './modules/recommendation/recommendation.component';
const routes: Routes = [
  {
    path: '',
    loadChildren: () =>
      import('./modules/home/home.module').then(m => m.HomeModule),
  },
  {
    path: 'projects',
    loadChildren: () =>
      import('./modules/projects/projects.module').then(
        m => m.ProjectsModule
      ),
  },
  {
    path: 'freelancers',
    loadChildren: () =>
      import('./modules/freelancer/freelancer.module').then(
        m => m.FreelancerModule
      ),
  },
  {
    path: 'my-projects',
    loadChildren: () =>
      import('./modules/my-projects/my-projects.module').then(
        m => m.MyProjectsModule
      ),
  },
  {
    path: 'my-offers',
    loadChildren: () =>
      import('./modules/my-offers/my-offers.module')
        .then(m => m.MyOffersModule),
  },
  {
    path: 'chatbot',
    component: ChatbotComponent,
  },
  {
    path: 'recommendation',
    component: RecommendationComponent,
  },
  {
    path: '**',
    redirectTo: '',
    pathMatch: 'full'
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
