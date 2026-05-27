import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ReviewRequest, FreelancerReplyRequest } from '../models/Review.model';
@Injectable({ providedIn: 'root' })
export class ReviewService {

  private readonly base = 'http://localhost:8082/api/reviews';

  constructor(private http: HttpClient) {}

  /** Client soumet une évaluation */
  submitReview(offerId: number, request: ReviewRequest): Observable<any> {
    return this.http.post(`${this.base}/offer/${offerId}`, request);
  }

  /** Freelancer répond à l'évaluation */
  submitReply(offerId: number, request: FreelancerReplyRequest): Observable<any> {
    return this.http.post(`${this.base}/offer/${offerId}/reply`, request);
  }

  /** Toutes les évaluations d'un freelancer */
  getFreelancerReviews(freelancerId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/freelancer/${freelancerId}`);
  }
}