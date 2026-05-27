import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Pack, UserType } from '../models/pack.model';
import { environment } from '../../../environments/environment';

interface CreateOrUpdatePackPayload {
  name: string;
  description: string;
  userType: Pack['userType'];
  options?: Pack['options'];
  price?: number;
  duration?: Pack['duration'];
  features: string[];
}

@Injectable({
  providedIn: 'root'
})
export class PackService {
  private apiUrl = `${environment.moatezServiceApiBaseUrl}/api/packs`;

  constructor(private http: HttpClient) {}

  // Récupérer tous les packs
  getAllPacks(): Observable<Pack[]> {
    return this.http.get<Pack[]>(this.apiUrl);
  }

  // Récupérer un pack par ID
  getPackById(id: number): Observable<Pack> {
    return this.http.get<Pack>(`${this.apiUrl}/${id}`);
  }

  // Récupérer les packs par type d'utilisateur
  getPacksByUserType(userType: UserType): Observable<Pack[]> {
    return this.http.get<Pack[]>(`${this.apiUrl}/user-type/${userType}`);
  }

  // Créer un pack
  createPack(pack: Pack): Observable<Pack> {
    return this.http.post<Pack>(this.apiUrl, this.toCreateOrUpdatePayload(pack));
  }

  // Mettre à jour un pack
  updatePack(id: number, pack: Pack): Observable<Pack> {
    return this.http.put<Pack>(`${this.apiUrl}/${id}`, this.toCreateOrUpdatePayload(pack));
  }

  // Supprimer un pack
  deletePack(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  private toCreateOrUpdatePayload(pack: Pack): CreateOrUpdatePackPayload {
    return {
      name: pack.name,
      description: pack.description,
      userType: pack.userType,
      options: pack.options,
      price: pack.price,
      duration: pack.duration,
      features: (pack.features || [])
        .map((feature) => (feature?.text ?? '').trim())
        .filter((text) => text.length > 0)
    };
  }
}