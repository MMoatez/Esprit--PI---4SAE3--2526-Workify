import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { RecommendationComponent } from './recommendation.component';

@NgModule({
  imports: [
    RouterModule.forChild([
      { path: '', component: RecommendationComponent }
    ])
  ],
})
export class RecommendationModule {}
