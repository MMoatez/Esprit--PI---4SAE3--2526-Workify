import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { MyOffer } from '../models/my-offer.model';

@Injectable({
  providedIn: 'root',
})
export class OffersService {

  private apiUrl = 'http://localhost:8082/api/offers';

  constructor(private http: HttpClient) {}

  // =========================
  // GET ALL OFFERS
  // =========================
  getAllOffers(): Observable<MyOffer[]> {
    return this.http.get<MyOffer[]>(this.apiUrl);
  }

  // =========================
  // GET OFFER BY ID
  // =========================
  getOfferById(id: number): Observable<MyOffer> {
    return this.http.get<MyOffer>(`${this.apiUrl}/${id}`);
  }

  // =========================
  // GET OFFERS BY PROJECT
  // =========================
  getOffersByProject(projectId: number): Observable<MyOffer[]> {
    return this.http.get<MyOffer[]>(
      `${this.apiUrl}/project/${projectId}`
    );
  }

  // =========================
  // CREATE OFFER (PROJECT + FREELANCER)
  // =========================
  createOffer(
  projectId: number,
  freelancerId: number,
  offer: Partial<MyOffer>
) {
  return this.http.post<MyOffer>(
    `http://localhost:8082/api/offers/project/${projectId}/freelancer/${freelancerId}`,
    offer
  );

  }

  // =========================
  // ACCEPT OFFER
  // =========================
  acceptOffer(id: number): Observable<MyOffer> {
    return this.http.put<MyOffer>(
      `${this.apiUrl}/${id}/accept`,
      {}
    );
  }

  // =========================
  // REJECT OFFER
  // =========================
  rejectOffer(id: number): Observable<MyOffer> {
    return this.http.put<MyOffer>(
      `${this.apiUrl}/${id}/reject`,
      {}
    );
  }

  // =========================
  // DELETE OFFER
  // =========================
  deleteOffer(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}