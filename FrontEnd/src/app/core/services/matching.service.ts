import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface MatchingResult {   // ✅ export obligatoire
  freelancer: {
    id: number;
    nom: string;
  };
  score: number;
  explication: string;
}

@Injectable({
  providedIn: 'root'
})
export class MatchingService {   // ✅ export obligatoire

  private apiUrl = 'http://localhost:8063/api/matching';

  constructor(private http: HttpClient) {}

  getMatchingResults(projectId: number): Observable<MatchingResult[]> {
    return this.http.get<MatchingResult[]>(`${this.apiUrl}/project/${projectId}`);
  }
}