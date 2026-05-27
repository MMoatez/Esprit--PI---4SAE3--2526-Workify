import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { UserProfile, UpdateProfileRequest, CompetenceDto } from '../models/user-profile.model';

@Injectable({ providedIn: 'root' })
export class UserProfileService {
  private readonly api = `${environment.apiBaseUrl}/api/users`;

  constructor(private http: HttpClient) { }

  getMe(): Observable<UserProfile> {
    return this.http.get<UserProfile>(`${this.api}/me`);
  }

  updateMe(body: UpdateProfileRequest): Observable<UserProfile> {
    return this.http.put<UserProfile>(`${this.api}/me`, body);
  }

  uploadAvatar(file: File): Observable<UserProfile> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<UserProfile>(`${this.api}/me/avatar`, formData);
  }

  addCompetence(name: string): Observable<CompetenceDto> {
    return this.http.post<CompetenceDto>(`${this.api}/me/competences`, { name });
  }

  removeCompetence(competenceId: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/me/competences/${competenceId}`);
  }

  importCv(cvData: any): Observable<UserProfile> {
    return this.http.post<UserProfile>(`${this.api}/me/import-cv`, cvData);
  }

  /** Full URL for profile picture (relative path from API). */
  getAvatarUrl(profilePicture: string | null): string | null {
    if (!profilePicture) return null;
    if (profilePicture.startsWith('http')) return profilePicture;
    return `${environment.apiBaseUrl}${profilePicture.startsWith('/') ? '' : '/'}${profilePicture}`;
  }

  getPublicFreelancers(): Observable<UserProfile[]> {
    return this.http.get<UserProfile[]>(`${environment.apiBaseUrl}/api/public/freelancers`);
  }

  getFreelancerById(id: number): Observable<UserProfile> {
    return this.http.get<UserProfile>(`${environment.apiBaseUrl}/api/public/freelancers/${id}`);
  }

  getPublicClients(): Observable<UserProfile[]> {
    return this.http.get<UserProfile[]>(`${environment.apiBaseUrl}/api/public/clients`);
  }

  getClientById(id: number): Observable<UserProfile> {
    return this.http.get<UserProfile>(`${environment.apiBaseUrl}/api/public/clients/${id}`);
  }

  getUserById(id: number): Observable<UserProfile> {
    return this.http.get<UserProfile>(`${environment.apiBaseUrl}/api/public/users/${id}`);}
  uploadCvPdf(file: File): Observable<UserProfile> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<UserProfile>(`${this.api}/me/cv-pdf`, formData);
  }

  getCvPdfUrl(cvPdf: string | null | undefined): string | null {
    if (!cvPdf) return null;
    if (cvPdf.startsWith('http')) return cvPdf;
    return `${environment.apiBaseUrl}${cvPdf.startsWith('/') ? '' : '/'}${cvPdf}`;
  }
}
