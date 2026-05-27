import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { BankPaymentFormComponent } from './bank-payment-form.component';
import { StripePaymentFormComponent } from './stripe-payment-form.component';

const routes: Routes = [
  {
    path: 'bank',
    component: BankPaymentFormComponent
  },
  {
    path: 'stripe',
    component: StripePaymentFormComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PaymentRoutingModule { }
