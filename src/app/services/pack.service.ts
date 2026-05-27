import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Pack, UserType } from '../models/pack.model';

@Injectable({
  providedIn: 'root'
})
export class PackService {
  private apiUrl = 'http://localhost:8089/api/packs';

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
    return this.http.post<Pack>(this.apiUrl, pack);
  }

  // Mettre à jour un pack
  updatePack(id: number, pack: Pack): Observable<Pack> {
    return this.http.put<Pack>(`${this.apiUrl}/${id}`, pack);
  }

  // Supprimer un pack
  deletePack(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}