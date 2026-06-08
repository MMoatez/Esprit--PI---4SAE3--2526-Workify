import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { MyOffer } from '../models/my-offer.model';

export interface CreateOfferRequest {
  price: number;
  deliveryTime: string;
  description: string;
}

@Injectable({
  providedIn: 'root',
})
export class OffersService {

  private apiUrl = 'http://localhost:8063/api/offers';
  private freelancerApiUrl = 'http://localhost:8063/api/freelancers';

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
    `http://localhost:8063/api/offers/project/${projectId}/freelancer/${freelancerId}`,
    offer
  );

  }

  createOfferForProject(
    projectId: number,
    freelancerId: number,
    payload: CreateOfferRequest,
  ): Observable<MyOffer> {
    return this.http.post<MyOffer>(
      `${this.apiUrl}/project/${projectId}/freelancer/${freelancerId}`,
      payload,
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
  // COMPLETE OFFER (freelancer marque terminé)
  // =========================
  completeOffer(id: number): Observable<MyOffer> {
    return this.http.put<MyOffer>(`${this.apiUrl}/${id}/complete`, {});
  }

  // =========================
  // DELETE OFFER
  // =========================
  deleteOffer(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  // =========================
  // GET OFFERS BY FREELANCER
  // =========================
  getOffersByFreelancer(freelancerId: number): Observable<MyOffer[]> {
    return this.http.get<MyOffer[]>(`${this.apiUrl}/freelancer/${freelancerId}`);
  }

  // =========================
  // GET OFFERS RECEIVED BY CLIENT
  // =========================
  getOffersByClientEmail(clientEmail: string): Observable<MyOffer[]> {
    return this.http.get<MyOffer[]>(`${this.apiUrl}/by-client`, { params: { clientEmail } });
  }

  // =========================
  // SYNC FREELANCER (find or create by userId + email)
  // =========================
  syncFreelancer(userId: number, nom: string, email: string): Observable<{ id: number; userId: number; nom: string; email: string }> {
    return this.http.post<{ id: number; userId: number; nom: string; email: string }>(
      `${this.freelancerApiUrl}/sync`,
      { userId, nom, email }
    );
  }
}