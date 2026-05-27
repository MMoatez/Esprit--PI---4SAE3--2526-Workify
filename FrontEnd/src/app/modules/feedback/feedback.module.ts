import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { FeedbackRoutingModule } from './feedback-routing.module';
import { StarRatingComponent } from './components/star-rating/star-rating.component';
import { EvaluationCountdownComponent } from './components/evaluation-countdown/evaluation-countdown.component';
import { FeedbackFormComponent } from './components/feedback-form/feedback-form.component';
import { FeedbackCardComponent } from './components/feedback-card/feedback-card.component';
import { FeedbackListComponent } from './components/feedback-list/feedback-list.component';
import { ResponseFormComponent } from './components/response-form/response-form.component';

@NgModule({
  declarations: [
    StarRatingComponent,
    EvaluationCountdownComponent,
    FeedbackFormComponent,
    FeedbackCardComponent,
    FeedbackListComponent,
    ResponseFormComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    FeedbackRoutingModule,
  ],
  exports: [
    // Exportés pour utilisation dans my-offers et freelancer-profile
    StarRatingComponent,
    EvaluationCountdownComponent,
    FeedbackFormComponent,
    FeedbackCardComponent,
    FeedbackListComponent,
    ResponseFormComponent,
  ]
})
export class FeedbackModule {}
