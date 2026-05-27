import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { jwtDecode } from 'jwt-decode';

const TOKEN_KEY = 'workify_access_token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  constructor(private router: Router, private http: HttpClient) { }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  setToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
  }

  removeToken(): void {
    localStorage.removeItem(TOKEN_KEY); 
    localStorage.removeItem('workify_role');
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  logout(): void {
    this.removeToken();
    this.router.navigate(['/']);
  }

  getUserId(): string | null {
    const token = this.getToken();
    if (!token) return null;
    try {
      const decoded: any = jwtDecode(token);
      return decoded.sub || null;
    } catch (e) {
      return null;
    }
  }

  getUserName(): string | null {
    const token = this.getToken();
    if (!token) return null;
    try {
      const decoded: any = jwtDecode(token);
      return decoded.name || decoded.preferred_username || decoded.given_name || null;
    } catch (e) {
      return null;
    }
  }

  getRole(): string | null {
    const token = this.getToken();
    if (!token) return null;
    try {
      const decoded: any = jwtDecode(token);

      // 1. realm_access.roles (Keycloak standard)
      const realmRoles: string[] = (decoded.realm_access?.roles || []).map((r: string) => r.toLowerCase());

      // 2. resource_access roles (Keycloak client-level roles)
      const resourceRoles: string[] = Object.values(decoded.resource_access || {})
        .flatMap((v: any) => v?.roles || [])
        .map((r: string) => r.toLowerCase());

      // 3. Direct "role" or "roles" field (custom JWT)
      const directRole = (decoded.role || '').toString().toLowerCase();

      const all = [...realmRoles, ...resourceRoles, directRole];

      if (all.includes('admin')) return 'ADMIN';
      if (all.includes('partner')) return 'PARTNER';
      if (all.includes('client')) return 'CLIENT';
      if (all.includes('freelancer')) return 'FREELANCER';

      // 4. Last fallback: store role at login time
      const stored = localStorage.getItem('workify_role');
      if (stored) return stored;

      return 'FREELANCER';
    } catch (e) {
      return null;
    }
  }

  /** Alias lowercase for components using getCurrentRole() */
  getCurrentRole(): string | null {
    return this.getRole()?.toLowerCase() || null;
  }

  /** Get email from JWT */
  getUserEmail(): string | null {
    const token = this.getToken();
    if (!token) return null;
    try {
      const decoded: any = jwtDecode(token);
      return decoded.email || decoded.preferred_username || null;
    } catch (e) {
      return null;
    }
  }

  /** Get numeric user ID stored in profile (from localStorage after login) */
  getNumericUserId(): number | null {
    const stored = localStorage.getItem('workify_numeric_id');
    return stored ? parseInt(stored, 10) : null;
  }

  setNumericUserId(id: number): void {
    localStorage.setItem('workify_numeric_id', id.toString());
  }

  /** Alias used by communication components */
  getUserRole(): string | null {
    return this.getRole();
  }

  /** Navigate to internal login page. */
  login(): void {
    this.router.navigate(['/auth/login']);
  }

  loginWithCredentials(credentials: any): Observable<any> {
    return this.http.post(`${this.getApiUrl()}/api/auth/login`, credentials);
  }

  /** Navigate to internal registration page. */
  register(): void {
    this.router.navigate(['/auth/register']);
  }

  // New methods for custom registration
  // New methods for custom registration
  registerUser(data: any, file: File | null = null) {
    const formData = new FormData();
    formData.append('data', new Blob([JSON.stringify(data)], { type: 'application/json' }));
    if (file) {
      formData.append('file', file);
    }
    return this.http.post(`${this.getApiUrl()}/api/registration/submit`, formData);
  }

  extractCompetences(file: File, role?: string) {
    const formData = new FormData();
    formData.append('file', file);
    if (role) {
      formData.append('role', role);
    }
    return this.http.post<string[]>(`${this.getApiUrl()}/api/registration/extract-competences`, formData);
  }

  checkEmail(email: string): Observable<{ exists: boolean }> {
    return this.http.get<{ exists: boolean }>(`${this.getApiUrl()}/api/registration/check-email?email=${email}`);
  }

  private getApiUrl(): string {
    return environment.apiBaseUrl;
  }

}
