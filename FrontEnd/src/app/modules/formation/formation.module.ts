import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';

import { FormationRoutingModule } from './formation-routing.module';
import { FormationListComponent } from './formation-list/formation-list.component';
import { FormationDetailComponent } from './formation-detail/formation-detail.component';
import { FormationPlayerComponent } from './pages/formation-player/formation-player.component';
import { MyCertificatesComponent } from './pages/my-certificates/my-certificates.component';
import { MyFormationsComponent } from './pages/my-formations/my-formations.component';
import { TakeQuizComponent } from './pages/take-quiz/take-quiz.component';
import { StarRatingComponent } from './components/star-rating/star-rating.component';

@NgModule({
  declarations: [
    FormationListComponent,
    FormationDetailComponent,
    FormationPlayerComponent,
    FormationPlayerComponent,
    MyCertificatesComponent,
    MyFormationsComponent,
    TakeQuizComponent,
    StarRatingComponent
  ],
  imports: [
    CommonModule,
    FormationRoutingModule,
    FormsModule,
    ReactiveFormsModule
  ]
})
export class FormationModule { }
