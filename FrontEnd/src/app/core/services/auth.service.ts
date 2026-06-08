import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, of, shareReplay, tap, catchError, map, finalize } from 'rxjs';
import { environment } from '../../../environments/environment';
import { jwtDecode } from 'jwt-decode';

const TOKEN_KEY = 'workify_access_token';
const REFRESH_TOKEN_KEY = 'workify_refresh_token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private refreshInProgress$: Observable<string | null> | null = null;
  private refreshTimer: ReturnType<typeof setInterval> | null = null;

  constructor(private router: Router, private http: HttpClient) { }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  }

  setToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
    this.startSessionKeeper();
  }

  setRefreshToken(token: string): void {
    localStorage.setItem(REFRESH_TOKEN_KEY, token);
  }

  setSession(accessToken: string, refreshToken?: string | null): void {
    this.setToken(accessToken);
    if (refreshToken) {
      this.setRefreshToken(refreshToken);
    }
  }

  removeToken(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem('workify_role');
    this.stopSessionKeeper();
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  isTokenExpired(bufferSeconds = 60): boolean {
    const token = this.getToken();
    if (!token) {
      return true;
    }

    try {
      const decoded: any = jwtDecode(token);
      if (!decoded?.exp) {
        return false;
      }
      return Date.now() >= (decoded.exp * 1000) - (bufferSeconds * 1000);
    } catch {
      return true;
    }
  }

  refreshTokenIfNeeded(): Observable<string | null> {
    if (!this.isTokenExpired() && this.getToken()) {
      return of(this.getToken());
    }

    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      return of(null);
    }

    if (!this.refreshInProgress$) {
      this.refreshInProgress$ = this.http.post<{
        access_token: string;
        refresh_token?: string;
      }>(`${this.getApiUrl()}/api/auth/refresh`, { refresh_token: refreshToken }).pipe(
        tap((response) => {
          if (response?.access_token) {
            this.setToken(response.access_token);
            if (response.refresh_token) {
              this.setRefreshToken(response.refresh_token);
            }
          }
        }),
        map((response) => response?.access_token || null),
        catchError(() => of(null)),
        finalize(() => {
          this.refreshInProgress$ = null;
        }),
        shareReplay(1)
      );
    }

    return this.refreshInProgress$;
  }

  startSessionKeeper(): void {
    this.stopSessionKeeper();
    if (!this.getToken()) {
      return;
    }

    this.refreshTimer = setInterval(() => {
      if (this.isTokenExpired(120)) {
        this.refreshTokenIfNeeded().subscribe((token) => {
          if (!token) {
            this.logout();
          }
        });
      }
    }, 30000);
  }

  stopSessionKeeper(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
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

      const realmRoles: string[] = (decoded.realm_access?.roles || []).map((r: string) => r.toLowerCase());

      const resourceRoles: string[] = Object.values(decoded.resource_access || {})
        .flatMap((v: any) => v?.roles || [])
        .map((r: string) => r.toLowerCase());

      const directRole = (decoded.role || '').toString().toLowerCase();

      const all = [...realmRoles, ...resourceRoles, directRole];

      if (all.includes('admin')) return 'ADMIN';
      if (all.includes('partner')) return 'PARTNER';
      if (all.includes('client')) return 'CLIENT';
      if (all.includes('freelancer')) return 'FREELANCER';

      const stored = localStorage.getItem('workify_role');
      if (stored) return stored;

      return 'FREELANCER';
    } catch (e) {
      return null;
    }
  }

  getCurrentRole(): string | null {
    return this.getRole()?.toLowerCase() || null;
  }

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

  getNumericUserId(): number | null {
    const stored = localStorage.getItem('workify_numeric_id');
    return stored ? parseInt(stored, 10) : null;
  }

  setNumericUserId(id: number): void {
    localStorage.setItem('workify_numeric_id', id.toString());
  }

  getUserRole(): string | null {
    return this.getRole();
  }

  login(): void {
    this.router.navigate(['/auth/login']);
  }

  loginWithCredentials(credentials: any): Observable<any> {
    return this.http.post(`${this.getApiUrl()}/api/auth/login`, credentials);
  }

  register(): void {
    this.router.navigate(['/auth/register']);
  }

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
