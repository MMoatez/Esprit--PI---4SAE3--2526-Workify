import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MyOffersComponent } from './my-offers.component';
import { CreateOfferComponent } from './create-offer/create-offer.component';

const routes: Routes = [
  {
    path: '',
    component: MyOffersComponent
  },
  {
    path: 'create/:projectId',
    component: CreateOfferComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class MyOffersRoutingModule {}
