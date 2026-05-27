import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { FeedbackListComponent } from './components/feedback-list/feedback-list.component';

const routes: Routes = [
  // /feedback/freelancer/123 — profil public d'un freelancer
  {
    path: 'freelancer/:id',
    component: FeedbackListComponent,
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class FeedbackRoutingModule {}
