import { Component, OnInit } from '@angular/core';
import { PaymentService } from '../../../../core/services/payment.service';
import { PaymentStatus, PaymentTransaction } from '../../../../core/models/payment.model';

@Component({
  standalone: false,
  selector: 'app-payment-management',
  templateUrl: './payment-management.component.html',
})
export class PaymentManagementComponent implements OnInit {
  transactions: PaymentTransaction[] = [];
  filtered: PaymentTransaction[] = [];

  loading = false;
  error = '';
  searchTerm = '';
  selectedStatus = 'ALL';

  PaymentStatus = PaymentStatus;

  constructor(private paymentService: PaymentService) {}

  ngOnInit(): void {
    this.loadTransactions();
  }

  loadTransactions(): void {
    this.loading = true;
    this.error = '';

    this.paymentService.getAllTransactions().subscribe({
      next: (data) => {
        this.transactions = (data || []).sort((a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        this.applyFilters();
        this.loading = false;
      },
      error: () => {
        this.error = 'Failed to load transactions.';
        this.loading = false;
      }
    });
  }

  applyFilters(): void {
    const term = this.searchTerm.trim().toLowerCase();

    const byStatus = this.selectedStatus === 'ALL'
      ? [...this.transactions]
      : this.transactions.filter(item => item.status === this.selectedStatus);

    this.filtered = !term
      ? byStatus
      : byStatus.filter(item =>
          (item.userFullName || '').toLowerCase().includes(term)
          || (item.userEmail || '').toLowerCase().includes(term)
          || (item.packName || '').toLowerCase().includes(term)
          || (item.stripePaymentIntentId || '').toLowerCase().includes(term)
        );
  }

  formatDate(value: string): string {
    return new Date(value).toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatAmount(amount: number, currency: string): string {
    return `${amount?.toFixed(2) ?? '0.00'} ${currency || ''}`.trim();
  }
}
