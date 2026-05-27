import { Duration } from './pack.model';

export enum StatutsSubscription {
  PENDING  = 'PENDING',
  ACTIVE   = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  REJECTED = 'REJECTED'
}

export enum PaymentMethod {
  ONLINE_PAYMENT = 'ONLINE_PAYMENT',
  BANK_DEPOSIT   = 'BANK_DEPOSIT',
  BANK_TRANSFER  = 'BANK_TRANSFER'
}

export const PaymentMethodDisplay: Record<PaymentMethod, string> = {
  [PaymentMethod.ONLINE_PAYMENT]: 'Online Payment',
  [PaymentMethod.BANK_DEPOSIT]:   'Bank Deposit',
  [PaymentMethod.BANK_TRANSFER]:  'Bank Transfer'
};

export interface CreateSubscriptionDto {
  userId: number;
  packId: number;
  selectedDuration: Duration;
  paymentMethod: PaymentMethod;
  transactionReference?: string;
  receiptPath?: string;
}

export interface SubscriptionResponse {
  id: number;
  userId: number;
  userFullName: string;
  userEmail: string;
  packId: number;
  packName: string;
  packPrice: number;
  packDuration: string;
  startDate: string | null;
  endDate: string | null;
  statuts: StatutsSubscription;
  amountPaid: number;
  paymentMethod: PaymentMethod;
  transactionReference?: string;
  receiptPath?: string;
  rejectionReason?: string;
  receiptConfidence?: number;
  aiValidationStatus?: 'APPROVED' | 'PENDING_ADMIN_VALIDATION' | 'REJECTED';
  extractedMetadata?: string;
  aiRejectionReason?: string;
  adminOverride?: boolean;
  createdAt: string;
}
