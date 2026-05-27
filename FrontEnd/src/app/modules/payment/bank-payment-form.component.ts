import { Component, EventEmitter, Input, Output } from '@angular/core';

interface Plan {
  id: string;
  name: string;
  price: number;
  billingPeriod: string;
}

@Component({
  selector: 'app-bank-payment-form',
  standalone: false,
  templateUrl: './bank-payment-form.component.html',
  styleUrls: ['./bank-payment-form.component.scss']
})
export class BankPaymentFormComponent {
  @Input() plan!: Plan;
  @Input() paymentMethod: 'bank-transfer' | 'cash-deposit' = 'bank-transfer';
  @Output() success = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  uploadedFile: File | null = null;
  uploading = false;
  submitted = false;
  copiedField: string | null = null;
  fullName = '';
  email = '';
  transactionRef = '';

  bankDetails = {
    bankName: 'FreelanceMatch Bank',
    accountName: 'FreelanceMatch Ltd',
    accountNumber: '1234567890',
    routingNumber: '987654321',
    swiftCode: 'FMLBANKUS',
    iban: 'US12 3456 7890 1234 5678 90'
  };

  handleFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    
    if (file) {
      const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
      const maxSize = 5 * 1024 * 1024;

      if (!validTypes.includes(file.type)) {
        alert('Please upload a valid file (JPG, PNG, or PDF)');
        input.value = '';
        return;
      }

      if (file.size > maxSize) {
        alert('File size must be less than 5MB');
        input.value = '';
        return;
      }

      this.uploadedFile = file;
    }
  }

  handleRemoveFile(): void {
    this.uploadedFile = null;
  }

  handleCopy(text: string, field: string): void {
    navigator.clipboard.writeText(text);
    this.copiedField = field;
    setTimeout(() => this.copiedField = null, 2000);
  }

  async handleSubmit(): Promise<void> {
    if (!this.uploadedFile) {
      alert('Please upload a payment receipt');
      return;
    }

    if (!this.fullName || !this.email || !this.transactionRef) {
      alert('Please fill in all required fields');
      return;
    }

    this.uploading = true;

    await new Promise(resolve => setTimeout(resolve, 2000));

    this.uploading = false;
    this.submitted = true;

    setTimeout(() => {
      this.success.emit();
    }, 3000);
  }

  onCancel(): void {
    this.cancel.emit();
  }

  getFileSize(): string {
    return this.uploadedFile ? (this.uploadedFile.size / 1024).toFixed(2) : '0';
  }
}
