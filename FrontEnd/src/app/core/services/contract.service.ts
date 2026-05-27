import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ContractRequest {
  projet_id:             string;
  projet_titre:          string;
  projet_description:    string;
  projet_budget:         number;
  projet_delai:          string;
  projet_debut:          string;
  client_nom:            string;
  client_email:          string;
  freelancer_nom:        string;
  freelancer_email:      string;
  freelancer_specialite: string;
  offre_montant:         number;
  offre_devise:          string;
}

@Injectable({ providedIn: 'root' })
export class ContractService {

  private readonly apiUrl = 'http://localhost:8082/api/contract/generate';

  constructor(private http: HttpClient) {}

  generateContract(req: ContractRequest): Observable<Blob> {
    return this.http.post(this.apiUrl, req, { responseType: 'blob' });
  }

  downloadPdf(blob: Blob, filename: string): void {
    const url    = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href     = url;
    anchor.download = filename;
    anchor.click();
    window.URL.revokeObjectURL(url);
  }
}