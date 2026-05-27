import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface UserProfile {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  accountStatus: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  profilePicture?: string;
  inscriptionDate: string;
}

export interface Page<T> {
  content: T[];
  totalPages: number;
  totalElements: number;
  size: number;
  number: number;
}

export interface AdminStatistics {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  totalFreelancers: number;
  totalClients: number;
  totalPartners: number;
  totalAdmins: number;
  newUsersThisMonth: number;
  activationRate: number;
}

export interface PartnerStatistics {
  totalFormations: number;
  totalChapters: number;
  totalLessons: number;
}

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private apiUrl = `${environment.apiBaseUrl}`;
  private formationApiUrl = `${environment.formationApiUrl}`;

  constructor(private http: HttpClient) { }

  getUsers(page: number, size: number, search?: string): Observable<Page<UserProfile>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    if (search) {
      params = params.set('search', search);
    }

    return this.http.get<Page<UserProfile>>(`${this.apiUrl}/api/admin/users`, { params });
  }

  getRecentUsers(): Observable<Page<UserProfile>> {
    return this.getUsers(0, 5);
  }

  toggleUserStatus(id: number): Observable<UserProfile> {
    return this.http.put<UserProfile>(`${this.apiUrl}/api/admin/users/${id}/status`, {});
  }

  getStatistics(): Observable<AdminStatistics> {
    return this.http.get<AdminStatistics>(`${this.apiUrl}/api/admin/statistics`);
  }

  getPartnerStatistics(): Observable<PartnerStatistics> {
    return this.http.get<PartnerStatistics>(`${this.formationApiUrl}/api/formations/statistics`);
  }
}
