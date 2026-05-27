import { Component, EventEmitter, Input, Output } from '@angular/core';

interface Plan {
  id: string;
  name: string;
  price: number;
  billingPeriod: string;
}

@Component({
  selector: 'app-stripe-payment-form',
  standalone: false,
  templateUrl: './stripe-payment-form.component.html',
  styleUrls: ['./stripe-payment-form.component.scss']
})
export class StripePaymentFormComponent {
  @Input() plan!: Plan;
  @Output() success = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  processing = false;
  error: string | null = null;
  successState = false;
  cardholderName = '';
  email = '';
  cardNumber = '';
  cardExpiry = '';
  cardCvc = '';

  async handleSubmit(): Promise<void> {
    if (!this.cardholderName || !this.email) {
      this.error = 'Please fill in all required fields';
      return;
    }

    if (!this.cardNumber || !this.cardExpiry || !this.cardCvc) {
      this.error = 'Please complete the card information';
      return;
    }

    this.processing = true;
    this.error = null;

    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const isSuccess = Math.random() > 0.1;
      
      if (isSuccess) {
        this.successState = true;
        setTimeout(() => {
          this.success.emit();
        }, 2000);
      } else {
        throw new Error('Payment failed. Please try again.');
      }
    } catch (err) {
      this.error = err instanceof Error ? err.message : 'An error occurred during payment';
      this.processing = false;
    }
  }

  onCancel(): void {
    this.cancel.emit();
  }

  formatCardNumber(event: Event): void {
    const input = event.target as HTMLInputElement;
    let value = input.value.replace(/\s/g, '');
    value = value.replace(/(\d{4})/g, '$1 ').trim();
    this.cardNumber = value;
  }

  formatExpiry(event: Event): void {
    const input = event.target as HTMLInputElement;
    let value = input.value.replace(/\s/g, '');
    if (value.length >= 2) {
      value = value.slice(0, 2) + ' / ' + value.slice(2, 4);
    }
    this.cardExpiry = value;
  }
}
