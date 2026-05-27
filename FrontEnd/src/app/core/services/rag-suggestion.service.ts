import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface SuggestionDto {
  text: string;
  tone: string;
}

export interface SuggestionResponse {
  suggestions: SuggestionDto[];
}

@Injectable({ providedIn: 'root' })
export class RagSuggestionService {

  private readonly apiUrl = `${environment.communicationApiBaseUrl}/api/suggestions`;

  constructor(private http: HttpClient) {}

  /**
   * Request RAG-powered suggestions for the current draft.
   * @param draft           Text the user is currently typing (may be empty)
   * @param userRole        FREELANCER | CLIENT | ADMIN
   * @param conversationId  Active conversation ID
   * @param userId          Current user ID (for authorisation check on the backend)
   */
  getSuggestions(
    draft: string,
    userRole: string,
    conversationId: number,
    userId: number,
    offset: number = 0
  ): Observable<SuggestionDto[]> {
    const body = { draft, userRole, conversationId, userId, offset };
    return this.http.post<SuggestionResponse>(this.apiUrl, body).pipe(
      map(res => res?.suggestions ?? []),
      catchError(() => of([]))   // silently return empty on any error
    );
  }
}
