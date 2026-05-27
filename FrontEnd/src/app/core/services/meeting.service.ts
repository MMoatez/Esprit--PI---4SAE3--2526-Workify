import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CreateMeetingDto, Meeting, MeetingProposal, VoteProposalDto } from '../models/meeting.model';

@Injectable({
  providedIn: 'root'
})
export class MeetingService {
  private readonly apiUrl = 'http://localhost:8089/api/meetings';

  constructor(private http: HttpClient) {}

  getMeetingsByProject(projectId: number): Observable<Meeting[]> {
    return this.http.get<Meeting[]>(`${this.apiUrl}/projet/${projectId}`);
  }

  createMeeting(dto: CreateMeetingDto): Observable<Meeting> {
    return this.http.post<Meeting>(this.apiUrl, dto);
  }

  voteForProposal(dto: VoteProposalDto): Observable<MeetingProposal> {
    return this.http.post<MeetingProposal>(`${this.apiUrl}/vote`, dto);
  }

  confirmMeeting(meetingId: number, proposalId: number): Observable<Meeting> {
    return this.http.put<Meeting>(`${this.apiUrl}/${meetingId}/confirm/${proposalId}`, {});
  }

  completeMeeting(meetingId: number, notes: string, userId: number): Observable<Meeting> {
    return this.http.put<Meeting>(`${this.apiUrl}/${meetingId}/complete`, { notes, userId: String(userId) });
  }

  updateMeetingNotes(meetingId: number, notes: string): Observable<Meeting> {
    return this.http.put<Meeting>(`${this.apiUrl}/${meetingId}/notes`, { notes });
  }

  cancelMeeting(meetingId: number, reason: string, userId: number): Observable<Meeting> {
    return this.http.put<Meeting>(`${this.apiUrl}/${meetingId}/cancel`, { reason, userId: String(userId) });
  }

  rejectMeeting(meetingId: number, reason: string, userId: number): Observable<Meeting> {
    return this.http.put<Meeting>(`${this.apiUrl}/${meetingId}/reject`, { reason, userId: String(userId) });
  }

  deleteMeeting(meetingId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${meetingId}`);
  }
}
