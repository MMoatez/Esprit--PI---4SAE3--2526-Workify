import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CheckoutSessionResponse,
  CreateCheckoutSessionRequest,
  CreatePaymentIntentRequest,
  PaymentIntentResponse,
  PaymentTransaction
} from '../models/payment.model';

@Injectable({ providedIn: 'root' })
export class PaymentService {
  private apiUrl = `${environment.moatezServiceApiBaseUrl}/api/payment`;

  constructor(private http: HttpClient) {}

  createPaymentIntent(payload: CreatePaymentIntentRequest): Observable<PaymentIntentResponse> {
    return this.http.post<PaymentIntentResponse>(`${this.apiUrl}/create`, payload);
  }

  createCheckoutSession(payload: CreateCheckoutSessionRequest): Observable<CheckoutSessionResponse> {
    return this.http.post<CheckoutSessionResponse>(`${this.apiUrl}/create-checkout-session`, payload);
  }

  confirmCheckoutSession(sessionId: string): Observable<PaymentTransaction> {
    return this.http.get<PaymentTransaction>(`${this.apiUrl}/confirm-checkout-session`, {
      params: { sessionId }
    });
  }

  getAllTransactions(): Observable<PaymentTransaction[]> {
    return this.http.get<PaymentTransaction[]>(`${this.apiUrl}/admin/transactions`);
  }
}
