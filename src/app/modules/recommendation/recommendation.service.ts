import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  RecommendRequest,
  RecommendResponse,
  InterfaceRecommandation,
  PaletteDetails
} from './recommendation.model';

@Injectable({ providedIn: 'root' })
export class RecommendationService {

  private readonly API_URL = 'http://localhost:8082/api/recommendation';
  private http = inject(HttpClient);

  recommend(request: RecommendRequest): Observable<RecommendResponse> {
    return this.http.post<RecommendResponse>(this.API_URL, request, {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  getPaletteColors(palette: PaletteDetails): { key: string; hex: string; nom: string; usage: string }[] {
    if (!palette?.raw) return [];
    return Object.entries(palette.raw)
      .filter(([_, v]) => v?.hex && v.hex.trim() !== '')
      .map(([key, v]) => ({
        key,
        hex: v.hex!,
        nom: v.nom || key,
        usage: v.usage || ''
      }));
  }

  getMaxScore(interfaces: InterfaceRecommandation[]): number {
    if (!interfaces?.length) return 1;
    return Math.max(...interfaces.map(i => i.score), 1);
  }

  getBarWidth(score: number, maxScore: number): string {
    return Math.round((score / maxScore) * 100) + '%';
  }

  getScorePercent(score: number): number {
    return Math.round(score * 100);
  }
}