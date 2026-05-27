import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { MyOffersRoutingModule } from './my-offers-routing.module';
import { MyOffersComponent } from './my-offers.component';
import { CreateOfferComponent } from './create-offer/create-offer.component';
import { FeedbackModule } from '../feedback/feedback.module';

@NgModule({
  declarations: [
    MyOffersComponent,
    CreateOfferComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MyOffersRoutingModule,
    FeedbackModule,
  ]
})
export class MyOffersModule { }
