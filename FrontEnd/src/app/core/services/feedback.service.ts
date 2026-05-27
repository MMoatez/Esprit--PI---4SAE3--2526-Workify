import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  FeedbackDto,
  FeedbackRequest,
  FeedbackUpdateRequest,
  FreelancerSummaryDto,
  EvaluationStatusDto,
  ResponseFeedbackDto,
  ResponseFeedbackRequest,
} from '../models/feedback.model';

@Injectable({ providedIn: 'root' })
export class FeedbackService {

  private readonly baseUrl = '/api';

  constructor(private http: HttpClient) {}

  // ── EVALUATION ──────────────────────────────────────────────────────────────

  triggerEvaluation(body: {
    offerId: number;
    clientEmail: string;
    freelancerId: number;
    projectTitle: string;
  }): Observable<any> {
    return this.http.post(`${this.baseUrl}/evaluation/trigger`, body);
  }

  getEvaluationStatus(offerId: number): Observable<EvaluationStatusDto> {
    return this.http.get<EvaluationStatusDto>(
      `${this.baseUrl}/evaluation/offer/${offerId}/status`
    );
  }

  // ── FEEDBACK ────────────────────────────────────────────────────────────────

  createFeedback(offerId: number, req: FeedbackRequest): Observable<FeedbackDto> {
    return this.http.post<FeedbackDto>(`${this.baseUrl}/feedback/offer/${offerId}`, req);
  }

  requestReview(offerId: number, req: FeedbackRequest): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/feedback/offer/${offerId}/request-review`, req);
  }

  getFeedbackByOffer(offerId: number): Observable<FeedbackDto> {
    return this.http.get<FeedbackDto>(`${this.baseUrl}/feedback/offer/${offerId}`);
  }

  getFeedbackById(feedbackId: number): Observable<FeedbackDto> {
    return this.http.get<FeedbackDto>(`${this.baseUrl}/feedback/${feedbackId}`);
  }

  updateFeedback(feedbackId: number, req: FeedbackUpdateRequest, clientEmail: string): Observable<FeedbackDto> {
    return this.http.put<FeedbackDto>(
      `${this.baseUrl}/feedback/${feedbackId}?clientEmail=${encodeURIComponent(clientEmail)}`, req
    );
  }

  deleteFeedback(feedbackId: number, clientEmail: string): Observable<void> {
    return this.http.delete<void>(
      `${this.baseUrl}/feedback/${feedbackId}?clientEmail=${encodeURIComponent(clientEmail)}`
    );
  }

  getFreelancerSummary(
    freelancerId: number,
    options: { rating?: number; sort?: string; order?: string; page?: number; size?: number } = {}
  ): Observable<FreelancerSummaryDto> {
    let params = new HttpParams();
    if (options.rating != null)  params = params.set('rating', options.rating);
    if (options.sort)            params = params.set('sort', options.sort);
    if (options.order)           params = params.set('order', options.order);
    if (options.page != null)    params = params.set('page', options.page);
    if (options.size != null)    params = params.set('size', options.size);
    return this.http.get<FreelancerSummaryDto>(
      `${this.baseUrl}/feedback/freelancer/${freelancerId}`, { params }
    );
  }

  // ── RESPONSE ─────────────────────────────────────────────────────────────────

  createResponse(feedbackId: number, req: ResponseFeedbackRequest): Observable<ResponseFeedbackDto> {
    return this.http.post<ResponseFeedbackDto>(
      `${this.baseUrl}/response-feedback/feedback/${feedbackId}`, req
    );
  }

  getResponse(feedbackId: number): Observable<ResponseFeedbackDto> {
    return this.http.get<ResponseFeedbackDto>(
      `${this.baseUrl}/response-feedback/feedback/${feedbackId}`
    );
  }

  updateResponse(responseId: number, req: ResponseFeedbackRequest): Observable<ResponseFeedbackDto> {
    return this.http.put<ResponseFeedbackDto>(
      `${this.baseUrl}/response-feedback/${responseId}`, req
    );
  }

  deleteResponse(responseId: number, freelancerId: number): Observable<void> {
    return this.http.delete<void>(
      `${this.baseUrl}/response-feedback/${responseId}?freelancerId=${freelancerId}`
    );
  }

  searchResponses(freelancerId: number, keyword: string, page = 0, size = 10): Observable<any> {
    const params = new HttpParams()
      .set('freelancerId', freelancerId)
      .set('keyword', keyword)
      .set('page', page)
      .set('size', size);
    return this.http.get(`${this.baseUrl}/response-feedback/search`, { params });
  }

  // ── MEDIA UPLOAD ─────────────────────────────────────────────────────────────

  uploadMedia(file: File): Observable<{ url: string }> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<{ url: string }>(`${this.baseUrl}/feedback/media/upload`, form);
  }

  // ── PDF REPORT ────────────────────────────────────────────────────────────────

  downloadReport(freelancerId: number, name: string = ''): Observable<Blob> {
    const params = name ? `?name=${encodeURIComponent(name)}` : '';
    return this.http.get(
      `${this.baseUrl}/feedback/freelancer/${freelancerId}/report.pdf${params}`,
      { responseType: 'blob' }
    );
  }

  // ── AI SUGGESTIONS ───────────────────────────────────────────────────────────

  getSuggestions(projectTitle: string, mode: 'feedback' | 'reply'): Observable<string[]> {
    const params = new HttpParams()
      .set('projectTitle', projectTitle)
      .set('mode', mode);
    return this.http.get<string[]>(`${this.baseUrl}/feedback/suggestions`, { params });
  }
}
