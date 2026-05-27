import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { PaymentRoutingModule } from './payment-routing.module';
import { BankPaymentFormComponent } from './bank-payment-form/bank-payment-form.component';
import { StripePaymentFormComponent } from './stripe-payment-form/stripe-payment-form.component';


@NgModule({
  declarations: [
    BankPaymentFormComponent,
    StripePaymentFormComponent
  ],
  imports: [
    CommonModule,
    PaymentRoutingModule
  ]
})
export class PaymentModule { }
