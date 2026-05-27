import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PaymentRoutingModule } from './payment-routing.module';
import { BankPaymentFormComponent } from './bank-payment-form.component';
import { StripePaymentFormComponent } from './stripe-payment-form.component';

@NgModule({
  declarations: [
    BankPaymentFormComponent,
    StripePaymentFormComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    PaymentRoutingModule
  ],
  exports: [
    BankPaymentFormComponent,
    StripePaymentFormComponent
  ]
})
export class PaymentModule { }
