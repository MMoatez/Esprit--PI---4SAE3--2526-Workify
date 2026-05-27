import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface FeedbackTranslationDto {
  feedbackId: number;
  sourceLang: string;
  targetLang: string;
  translatedComment: string;
  cached: boolean;
}

@Injectable({ providedIn: 'root' })
export class TranslationService {

  private readonly base = `/api/feedback`;

  /** Browser language code, e.g. "en", "fr", "ar" */
  readonly browserLang: string = navigator.language.split(/[-_]/)[0].toLowerCase();

  constructor(private http: HttpClient) {}

  /**
   * Fetches (or retrieves from cache) the translation of a feedback comment.
   * The backend caches translations in DB — subsequent calls are instant.
   */
  translate(feedbackId: number, targetLang: string): Observable<FeedbackTranslationDto> {
    return this.http.get<FeedbackTranslationDto>(
      `${this.base}/${feedbackId}/translate?lang=${targetLang}`
    );
  }

  /** True if the feedback was written in a different language than the browser. */
  needsTranslation(sourceLang: string | undefined): boolean {
    if (!sourceLang) return false;
    return sourceLang.toLowerCase() !== this.browserLang;
  }

  /** Human-readable language name for the badge. */
  langLabel(code: string): string {
    const map: Record<string, string> = {
      fr: 'French', en: 'English', ar: 'Arabic',
      es: 'Spanish', de: 'German', it: 'Italian',
      pt: 'Portuguese', zh: 'Chinese', ru: 'Russian',
      tr: 'Turkish', nl: 'Dutch', ko: 'Korean',
      ja: 'Japanese', hi: 'Hindi',
    };
    return map[code?.toLowerCase()] ?? code?.toUpperCase();
  }
}
