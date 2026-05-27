import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface PredictRequest {
  job_title: string;
  tags: string[];
  rate_type: string;
  client_country?: string;
}

export interface PredictResponse {
  predicted_min: number;
  predicted_max: number;
  predicted_avg: number;
  currency: string;
}

export interface SegmentRequest {
  budget: number;
  client_rating: number;
  client_review_count: number;
}

export interface SegmentResponse {
  segment: number;
  label: string;
}

export interface MlRecommendRequest {
  category: string;
  target_budget: number;
  top_n?: number;
}

export interface MlProjectSummary {
  projectId: string;
  job_title: string;
  tags: string[];
  avg_price: number;
  rate_type: string;
  client_country: string | null;
  score: number;
}

export interface MlRecommendResponse {
  recommendations: MlProjectSummary[];
}

@Injectable({ providedIn: 'root' })
export class MlService {
  private readonly BASE = '/ml';

  constructor(private http: HttpClient) {}

  predict(req: PredictRequest): Observable<PredictResponse> {
    return this.http.post<PredictResponse>(`${this.BASE}/predict`, req);
  }

  segment(req: SegmentRequest): Observable<SegmentResponse> {
    return this.http.post<SegmentResponse>(`${this.BASE}/segment`, req);
  }

  recommend(req: MlRecommendRequest): Observable<MlRecommendResponse> {
    return this.http.post<MlRecommendResponse>(`${this.BASE}/recommend`, req);
  }
}
