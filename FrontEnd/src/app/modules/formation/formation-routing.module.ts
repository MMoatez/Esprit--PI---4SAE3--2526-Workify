import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { FormationListComponent } from './formation-list/formation-list.component';
import { FormationDetailComponent } from './formation-detail/formation-detail.component';
import { FormationPlayerComponent } from './pages/formation-player/formation-player.component';
import { MyCertificatesComponent } from './pages/my-certificates/my-certificates.component';
import { MyFormationsComponent } from './pages/my-formations/my-formations.component';
import { TakeQuizComponent } from './pages/take-quiz/take-quiz.component';

const routes: Routes = [
  { path: '', component: FormationListComponent },
  { path: 'my-courses', component: MyFormationsComponent },
  { path: 'my-certificates', component: MyCertificatesComponent },
  { path: ':id', component: FormationDetailComponent },
  { path: ':id/play', component: FormationPlayerComponent },
  { path: ':id/quiz', component: TakeQuizComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class FormationRoutingModule { }
