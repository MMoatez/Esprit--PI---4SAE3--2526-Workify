import { Duration } from './pack.model';

export enum PaymentStatus {
  PENDING = 'PENDING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED'
}

export interface CreatePaymentIntentRequest {
  userId: number;
  packId: number;
  selectedDuration: Duration;
}

export interface PaymentIntentResponse {
  paymentId: number;
  paymentIntentId: string;
  clientSecret: string;
  amount: number;
  currency: string;
}

export interface CreateCheckoutSessionRequest {
  userId: number;
  packId: number;
  selectedDuration: Duration;
  successUrl: string;
  cancelUrl: string;
}

export interface CheckoutSessionResponse {
  sessionId: string;
  checkoutUrl: string;
  paymentId: number;
}

export interface PaymentTransaction {
  id: number;
  userId: number;
  userFullName: string;
  userEmail: string;
  packName: string;
  selectedDuration: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  stripePaymentIntentId: string | null;
  createdAt: string;
}
