import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  Event, CreateEventRequest, EventStatus,
  EventCategory, EventPartner, InvitePartnerRequest,
  EventRegistration, RegisterEventRequest, EventStats, RegistrationStatus,
  PartnerSummary, PartnerStatus, AddContentRequest
} from '../models/event.model';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class EventService {

  private apiUrl = 'http://localhost:8096/api/events';

  constructor(private http: HttpClient, private authService: AuthService) {}

  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  // ===============================
  // EVENTS
  // ===============================

  getAllEvents(): Observable<Event[]> {
    return this.http.get<Event[]>(this.apiUrl, { headers: this.getHeaders() });
  }

  getPublishedEvents(): Observable<Event[]> {
    return this.http.get<Event[]>(`${this.apiUrl}/published`);
  }

  getEventById(id: number): Observable<Event> {
    return this.http.get<Event>(`${this.apiUrl}/${id}`, { headers: this.getHeaders() });
  }

  getEventsByCategory(category: EventCategory): Observable<Event[]> {
    return this.http.get<Event[]>(`${this.apiUrl}/category/${category}`);
  }

  createEvent(request: CreateEventRequest): Observable<Event> {
    return this.http.post<Event>(this.apiUrl, request, { headers: this.getHeaders() });
  }

  updateEvent(id: number, request: CreateEventRequest): Observable<Event> {
    return this.http.put<Event>(`${this.apiUrl}/${id}`, request, { headers: this.getHeaders() });
  }

  updateStatus(id: number, status: EventStatus): Observable<Event> {
    return this.http.patch<Event>(
      `${this.apiUrl}/${id}/status?status=${status}`, {},
      { headers: this.getHeaders() });
  }

  deleteEvent(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`, { headers: this.getHeaders() });
  }

  getEventStats(id: number): Observable<EventStats> {
    return this.http.get<EventStats>(`${this.apiUrl}/${id}/stats`, { headers: this.getHeaders() });
  }

  // ===============================
  // PARTNERS
  // ===============================

  invitePartner(eventId: number, request: InvitePartnerRequest): Observable<EventPartner> {
    return this.http.post<EventPartner>(
      `${this.apiUrl}/${eventId}/partners`, request,
      { headers: this.getHeaders() });
  }

  getEventPartners(eventId: number): Observable<EventPartner[]> {
    return this.http.get<EventPartner[]>(
      `${this.apiUrl}/${eventId}/partners`,
      { headers: this.getHeaders() });
  }

  getAvailablePartners(eventId: number): Observable<PartnerSummary[]> {
    return this.http.get<PartnerSummary[]>(
      `${this.apiUrl}/${eventId}/available-partners`,
      { headers: this.getHeaders() });
  }

  getMyInvitations(): Observable<EventPartner[]> {
    return this.http.get<EventPartner[]>(
      `${this.apiUrl}/partner/my-invitations`,
      { headers: this.getHeaders() });
  }

  respondToInvitation(token: string, response: PartnerStatus): Observable<EventPartner> {
    return this.http.put<EventPartner>(
      `${this.apiUrl}/partners/respond/${token}`,
      { response },
      { headers: this.getHeaders() });
  }

  addEventContent(eventId: number, content: AddContentRequest): Observable<any> {
    return this.http.post<any>(
      `${this.apiUrl}/${eventId}/content`,
      content,
      { headers: this.getHeaders() });
  }

  // ===============================
  // REGISTRATIONS
  // ===============================

  registerToEvent(eventId: number, request: RegisterEventRequest): Observable<EventRegistration> {
    return this.http.post<EventRegistration>(
      `${this.apiUrl}/${eventId}/register`, request,
      { headers: this.getHeaders() });
  }

  cancelRegistration(eventId: number): Observable<void> {
    return this.http.delete<void>(
      `${this.apiUrl}/${eventId}/register`,
      { headers: this.getHeaders() });
  }

  getEventRegistrations(eventId: number): Observable<EventRegistration[]> {
    return this.http.get<EventRegistration[]>(
      `${this.apiUrl}/${eventId}/registrations`,
      { headers: this.getHeaders() });
  }

  getMyRegistration(eventId: number): Observable<EventRegistration> {
    return this.http.get<EventRegistration>(
      `${this.apiUrl}/${eventId}/my-registration`,
      { headers: this.getHeaders() });
  }

  getMyRegistrations(): Observable<EventRegistration[]> {
    return this.http.get<EventRegistration[]>(
      `${this.apiUrl}/my-registrations`,
      { headers: this.getHeaders() });
  }

  updateRegistrationStatus(eventId: number, registrationId: number, status: RegistrationStatus): Observable<EventRegistration> {
    return this.http.patch<EventRegistration>(
      `${this.apiUrl}/${eventId}/registrations/${registrationId}/status?status=${status}`,
      {},
      { headers: this.getHeaders() });
  }

  downloadIcal(eventId: number): void {
    this.http.get(`${this.apiUrl}/${eventId}/ical`, {
      responseType: 'blob',
      headers: this.getHeaders()
    }).subscribe(blob => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `event-${eventId}.ics`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    });
  }

  getTicketQrCode(eventId: number, registrationId: number): Observable<Blob> {
    return this.http.get(
      `${this.apiUrl}/${eventId}/ticket/${registrationId}/qr`,
      { headers: this.getHeaders(), responseType: 'blob' }
    );
  }

  markAttended(eventId: number, registrationId: number): Observable<EventRegistration> {
    return this.http.post<EventRegistration>(
      `${this.apiUrl}/${eventId}/registrations/${registrationId}/attend`,
      {},
      { headers: this.getHeaders() }
    );
  }

  validateTicket(qrData: string): Observable<any> {
    return this.http.post<any>(
      `${this.apiUrl}/validate-ticket`,
      { qrData },
      { headers: this.getHeaders() }
    );
  }

  scanTicket(qrToken: string): Observable<any> {
    return this.http.post<any>(
      `${this.apiUrl}/scan`,
      { qrToken },
      { headers: this.getHeaders() }
    );
  }

  resendTicketEmail(eventId: number, registrationId: number): Observable<void> {
    return this.http.post<void>(
      `${this.apiUrl}/${eventId}/registrations/${registrationId}/send-ticket`,
      {},
      { headers: this.getHeaders() }
    );
  }

  getEventAnalytics(eventId: number): Observable<any> {
    return this.http.get<any>(
      `${this.apiUrl}/${eventId}/analytics`,
      { headers: this.getHeaders() }
    );
  }

  // ===============================
  // AI FEATURES
  // ===============================

  aiGenerateEvent(prompt: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/ai/generate-event`, { prompt }, { headers: this.getHeaders() });
  }

  aiPredictAttendance(eventId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/ai/predict/${eventId}`, { headers: this.getHeaders() });
  }

  aiGetInsights(eventId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/ai/insights/${eventId}`, { headers: this.getHeaders() });
  }

  aiRecommendPartners(eventId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/ai/recommend-partners/${eventId}`, { headers: this.getHeaders() });
  }

  aiGenerateEmail(eventId: number, recipientType: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/ai/generate-email/${eventId}`, { recipientType }, { headers: this.getHeaders() });
  }

  aiSuggestSchedule(eventType: string, category: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/ai/suggest-schedule`, { eventType, category }, { headers: this.getHeaders() });
  }

  getRegistrationQuiz(eventId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/ai/quiz/${eventId}`, { headers: this.getHeaders() });
  }

  validateQuiz(eventId: number, answers: { questionId: number; selectedIndex: number }[]): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/ai/quiz/${eventId}/validate`, { answers }, { headers: this.getHeaders() });
  }
}