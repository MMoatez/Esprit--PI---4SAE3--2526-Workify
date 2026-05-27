import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ConversationSummaryService {

  private readonly base = environment.communicationApiBaseUrl;

  constructor(private http: HttpClient) {}

  /**
   * Calls GET /api/conversations/{id}/summary?userId={userId}
   * Returns the AI-generated summary string.
   */
  getSummary(conversationId: number, userId: number): Observable<string> {
    const params = new HttpParams().set('userId', userId.toString());
    return this.http
      .get<{ summary: string }>(`${this.base}/api/conversations/${conversationId}/summary`, { params })
      .pipe(
        map(res => res?.summary ?? ''),
        catchError(() => of('Unable to generate summary. Please try again later.'))
      );
  }
}
