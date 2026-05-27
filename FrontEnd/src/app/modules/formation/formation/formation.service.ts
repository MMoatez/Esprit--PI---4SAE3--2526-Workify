import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export enum Domain {
  IT = 'IT',
  MARKETING = 'MARKETING',
  DESIGN_CREATION = 'DESIGN_CREATION',
  SECURITY_NETWORK = 'SECURITY_NETWORK'
}

export enum EnrollmentStatus {
  ENROLLED = 'ENROLLED',
  COMPLETED = 'COMPLETED'
}

export enum Status {
  ONLINE = 'ONLINE',
  ON_SITE = 'ON_SITE'
}

export interface Formation {
  id?: number;
  title: string;
  description: string;
  field: Domain;
  level?: number;
  status: Status;
  idPackFk?: number;
  period?: string;
  googleMeetLink?: string;
  address?: string;
}

export interface Chapter {
  id?: number;
  title: string;
  position?: number;
  formationId: number;
}

export interface Lesson {
  id?: number;
  title: string;
  content: string;
  videoUrl?: string;
  pdfUrl?: string;
  position?: number;
  chapterId: number;
}

export interface Enrollment {
  id?: number;
  userId: string;
  formation: Formation;
  status: EnrollmentStatus;
  enrolledAt: string;
  completedAt?: string;
  progress: number;
  completedLessonIds: number[];
}

export interface Certificate {
  id?: number;
  userId: string;
  formation: Formation;
  dateObtained: string;
}

export interface Option {
  id?: number;
  text: string;
  isCorrect?: boolean;
}

export interface Question {
  id?: number;
  text: string;
  options: Option[];
}

export interface Quiz {
  id?: number;
  title: string;
  questions: Question[];
}

export interface QuizSubmission {
  userId: string;
  answers: { [key: number]: number };
}

export interface QuizResponse {
  score: number;
  passed: boolean;
  message: string;
}

export interface Review {
  id?: number;
  rating: number;
  comment: string;
  userId: string;
  formationId: number;
  createdAt: string;
}

export interface ReviewRequest {
  rating: number;
  comment: string;
  formationId: number;
}

@Injectable({
  providedIn: 'root'
})
export class FormationService {
  private apiUrl = `${environment.formationApiUrl}/api/formations`;
  private certUrl = `${environment.formationApiUrl}/api/certificates`;
  private chapterUrl = `${environment.formationApiUrl}/api/chapters`;
  private lessonUrl = `${environment.formationApiUrl}/api/lessons`;
  private enrollmentUrl = `${environment.formationApiUrl}/api/enrollments`;
  private reviewUrl = `${environment.formationApiUrl}/api/reviews`;

  constructor(private http: HttpClient) { }

  // Formation Endpoints
  getFormations(): Observable<Formation[]> {
    return this.http.get<Formation[]>(this.apiUrl);
  }

  getFormationById(id: number): Observable<Formation> {
    return this.http.get<Formation>(`${this.apiUrl}/${id}`);
  }

  createFormation(formation: Formation): Observable<Formation> {
    return this.http.post<Formation>(this.apiUrl, formation);
  }

  updateFormation(id: number, formation: Formation): Observable<Formation> {
    return this.http.put<Formation>(`${this.apiUrl}/${id}`, formation);
  }

  deleteFormation(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  // Chapter Endpoints
  getChapters(formationId: number): Observable<Chapter[]> {
    return this.http.get<Chapter[]>(`${this.chapterUrl}/formation/${formationId}`);
  }

  createChapter(chapter: Chapter): Observable<Chapter> {
    return this.http.post<Chapter>(this.chapterUrl, chapter);
  }

  updateChapter(id: number, chapter: Chapter): Observable<Chapter> {
    return this.http.put<Chapter>(`${this.chapterUrl}/${id}`, chapter);
  }

  deleteChapter(id: number): Observable<void> {
    return this.http.delete<void>(`${this.chapterUrl}/${id}`);
  }

  // Lesson Endpoints
  getLessons(chapterId: number): Observable<Lesson[]> {
    return this.http.get<Lesson[]>(`${this.lessonUrl}/chapter/${chapterId}`);
  }

  createLesson(lesson: Lesson): Observable<Lesson> {
    return this.http.post<Lesson>(this.lessonUrl, lesson);
  }

  updateLesson(id: number, lesson: Lesson): Observable<Lesson> {
    return this.http.put<Lesson>(`${this.lessonUrl}/${id}`, lesson);
  }

  uploadLessonPdf(lessonId: number, file: File): Observable<Lesson> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<Lesson>(`${this.lessonUrl}/${lessonId}/pdf`, formData);
  }

  deleteLesson(id: number): Observable<void> {
    return this.http.delete<void>(`${this.lessonUrl}/${id}`);
  }

  // Enrollment & Progress Endpoints
  enroll(formationId: number): Observable<Enrollment> {
    return this.http.post<Enrollment>(`${this.enrollmentUrl}/formation/${formationId}`, {});
  }

  checkEnrollment(formationId: number): Observable<Enrollment> {
    return this.http.get<Enrollment>(`${this.enrollmentUrl}/formation/${formationId}`);
  }

  getMyEnrollments(): Observable<Enrollment[]> {
    return this.http.get<Enrollment[]>(`${this.enrollmentUrl}/my`);
  }

  completeLesson(lessonId: number): Observable<void> {
    return this.http.post<void>(`${this.enrollmentUrl}/lesson/${lessonId}/complete`, {});
  }

  // Certificate Endpoints
  getUserCertificates(userId: string): Observable<Certificate[]> {
    return this.http.get<Certificate[]>(`${this.certUrl}/user/${userId}`);
  }

  issueCertificate(userId: string, formationId: number): Observable<Certificate> {
    return this.http.post<Certificate>(this.certUrl, { userId, formationId });
  }

  // Quiz Endpoints
  getQuiz(formationId: number): Observable<Quiz> {
    return this.http.get<Quiz>(`${this.apiUrl}/${formationId}/quiz`);
  }

  submitQuiz(formationId: number, submission: QuizSubmission): Observable<QuizResponse> {
    return this.http.post<QuizResponse>(`${this.apiUrl}/${formationId}/quiz/submit`, submission);
  }

  upsertQuiz(formationId: number, quiz: Quiz): Observable<Quiz> {
    return this.http.post<Quiz>(`${this.apiUrl}/${formationId}/quiz/admin`, quiz);
  }

  // Review Endpoints
  submitReview(review: ReviewRequest): Observable<Review> {
    return this.http.post<Review>(this.reviewUrl, review);
  }

  getReviews(formationId: number): Observable<Review[]> {
    return this.http.get<Review[]>(`${this.reviewUrl}/formation/${formationId}`);
  }

  getAverageRating(formationId: number): Observable<number> {
    return this.http.get<number>(`${this.reviewUrl}/formation/${formationId}/average`);
  }
}
