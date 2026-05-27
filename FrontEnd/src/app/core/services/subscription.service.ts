import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of } from 'rxjs';
import { CreateSubscriptionDto, SubscriptionResponse } from '../models/subscription.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class SubscriptionService {
  private apiUrl = `${environment.moatezServiceApiBaseUrl}/api/subscriptions`;

  constructor(private http: HttpClient) {}

  uploadReceipt(file: File): Observable<{ receiptPath: string }> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<{ receiptPath: string }>(`${this.apiUrl}/upload-receipt`, formData);
  }

  subscribe(dto: CreateSubscriptionDto): Observable<SubscriptionResponse> {
    return this.http.post<SubscriptionResponse>(this.apiUrl, dto);
  }

  getAllSubscriptions(): Observable<SubscriptionResponse[]> {
    return this.http.get<SubscriptionResponse[]>(this.apiUrl);
  }

  getSubscriptionsByUser(userId: number): Observable<SubscriptionResponse[]> {
    return this.http.get<SubscriptionResponse[]>(`${this.apiUrl}/user/${userId}`);
  }

  getActiveSubscription(userId: number): Observable<SubscriptionResponse> {
    return this.http.get<SubscriptionResponse>(`${this.apiUrl}/user/${userId}/active`);
  }

  getActiveSubscriptionOrNull(userId: number): Observable<SubscriptionResponse | null> {
    return this.http
      .get<SubscriptionResponse>(`${this.apiUrl}/user/${userId}/active`)
      .pipe(catchError(() => of(null)));
  }

  cancelSubscription(id: number): Observable<SubscriptionResponse> {
    return this.http.put<SubscriptionResponse>(`${this.apiUrl}/${id}/cancel`, {});
  }

  approveSubscription(id: number): Observable<SubscriptionResponse> {
    return this.http.put<SubscriptionResponse>(`${this.apiUrl}/${id}/approve`, {});
  }

  rejectSubscription(id: number, reason: string): Observable<SubscriptionResponse> {
    return this.http.put<SubscriptionResponse>(`${this.apiUrl}/${id}/reject`, { reason });
  }

  aiOverride(id: number, approve: boolean, reason = ''): Observable<SubscriptionResponse> {
    return this.http.put<SubscriptionResponse>(`${this.apiUrl}/${id}/ai-override`, { approve, reason });
  }

  exportSubscriptions(fromDate?: string, toDate?: string): Observable<Blob> {
    const params: string[] = [];
    if (fromDate) params.push(`fromDate=${fromDate}`);
    if (toDate)   params.push(`toDate=${toDate}`);
    const query = params.length ? `?${params.join('&')}` : '';
    return this.http.get(`${this.apiUrl}/export${query}`, { responseType: 'blob' });
  }
}
