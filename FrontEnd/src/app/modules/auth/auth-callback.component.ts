import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  standalone: false,
  selector: 'app-auth-callback',
  template: `
    <div class="min-h-screen flex items-center justify-center bg-slate-50">
      <div class="text-center">
        <p class="text-slate-600">Signing in...</p>
        <p class="text-sm text-slate-500 mt-2">Redirecting to your profile</p>
      </div>
    </div>
  `,
})
export class AuthCallbackComponent implements OnInit {
  constructor(
    private auth: AuthService,
    private router: Router,
  ) { }

  ngOnInit(): void {
    const hash = window.location.hash?.slice(1);
    if (!hash) {
      this.router.navigate(['/auth/login']);
      return;
    }
    const params = new URLSearchParams(hash);
    const accessToken = params.get('access_token');
    if (accessToken) {
      this.auth.setToken(accessToken);
      this.router.navigate(['/profile']);
    } else {
      this.router.navigate(['/auth/login']);
    }
  }
}
