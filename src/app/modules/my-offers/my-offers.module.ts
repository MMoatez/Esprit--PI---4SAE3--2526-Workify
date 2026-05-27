import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { MyOffersRoutingModule } from './my-offers-routing.module';
import { MyOffersComponent } from './my-offers.component';
import { CreateOfferComponent } from './create-offer/create-offer.component';

@NgModule({
  declarations: [
    MyOffersComponent,
    CreateOfferComponent
  ],
  imports: [
    CommonModule,      // 🔥 OBLIGATOIRE
    FormsModule,       // 🔥 OBLIGATOIRE
    MyOffersRoutingModule
  ]
})
export class MyOffersModule { }
