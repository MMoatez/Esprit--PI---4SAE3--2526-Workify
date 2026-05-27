import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { UserProfileService } from '../../core/services/user-profile.service';
import { ConversationService } from '../../core/services/conversation.service';
import { PriorityNotificationService } from '../../core/services/priority-notification.service';
import { FeedbackNotificationService } from '../../core/services/feedback-notification.service';
import { RecaptchaModule } from 'ng-recaptcha';

import { RECAPTCHA_SETTINGS, RecaptchaSettings } from 'ng-recaptcha';
import { environment } from '../../../environments/environment';

@Component({
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, RecaptchaModule],
  providers: [
    {
      provide: RECAPTCHA_SETTINGS,
      useValue: {
        siteKey: environment.recaptcha.siteKey,
        enterprise: false,
      } as RecaptchaSettings,
    },
  ],
  selector: 'app-auth-login',
  styles: [`
    @keyframes authFloat {
      0%, 100% { transform: translate(0, 0) scale(1); }
      33% { transform: translate(30px, -20px) scale(1.05); }
      66% { transform: translate(-20px, 15px) scale(0.95); }
    }
    @keyframes authPulse {
      0%, 100% { opacity: 0.5; }
      50% { opacity: 0.8; }
    }
    @keyframes shimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }
    @keyframes cardEntry {
      0% { opacity: 0; transform: translateY(30px) scale(0.97); }
      100% { opacity: 1; transform: translateY(0) scale(1); }
    }
    @keyframes iconBounce {
      0%, 100% { transform: translateY(-50%); }
      50% { transform: translateY(-55%); }
    }
    :host { display: block; }
    .auth-page {
      min-height: 100vh;
      display: flex;
      position: relative;
      overflow: hidden;
      background: linear-gradient(135deg, #f0fdfa 0%, #f8fafc 40%, #eef2ff 100%);
    }
    /* Animated background orbs */
    .auth-orb {
      position: absolute;
      border-radius: 50%;
      filter: blur(80px);
      animation: authFloat 12s ease-in-out infinite;
      pointer-events: none;
    }
    .auth-orb--1 {
      width: 400px; height: 400px;
      background: radial-gradient(circle, rgba(13,148,136,0.15), transparent 70%);
      top: -10%; left: -5%;
      animation-delay: 0s;
    }
    .auth-orb--2 {
      width: 350px; height: 350px;
      background: radial-gradient(circle, rgba(79,70,229,0.1), transparent 70%);
      bottom: -10%; right: -5%;
      animation-delay: -4s;
    }
    .auth-orb--3 {
      width: 250px; height: 250px;
      background: radial-gradient(circle, rgba(13,148,136,0.08), transparent 70%);
      top: 50%; left: 50%;
      animation-delay: -8s;
    }
    /* Left branding panel */
    .auth-branding {
      display: none;
      width: 45%;
      background: linear-gradient(160deg, #0f766e 0%, #0d9488 40%, #14b8a6 100%);
      position: relative;
      overflow: hidden;
      padding: 3rem;
      flex-direction: column;
      justify-content: center;
      align-items: center;
    }
    @media (min-width: 1024px) {
      .auth-branding { display: flex; }
    }
    .auth-branding::before {
      content: '';
      position: absolute;
      inset: 0;
      background: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.04'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
    }
    .branding-float-1, .branding-float-2 {
      position: absolute;
      border-radius: 50%;
      animation: authFloat 10s ease-in-out infinite;
    }
    .branding-float-1 {
      width: 200px; height: 200px;
      background: rgba(255,255,255,0.06);
      top: 10%; right: -40px;
      animation-delay: -2s;
    }
    .branding-float-2 {
      width: 160px; height: 160px;
      background: rgba(255,255,255,0.04);
      bottom: 15%; left: -30px;
      animation-delay: -6s;
    }
    .branding-content {
      position: relative;
      z-index: 10;
      text-align: center;
      color: white;
    }
    .branding-logo {
      width: 120px; height: 120px;
      margin: 0 auto 2rem;
      filter: brightness(0) invert(1);
      object-fit: contain;
    }
    .branding-title {
      font-size: 2.5rem;
      font-weight: 800;
      line-height: 1.1;
      margin-bottom: 1rem;
      letter-spacing: -0.02em;
    }
    .branding-subtitle {
      font-size: 1.1rem;
      opacity: 0.85;
      line-height: 1.6;
      max-width: 320px;
      margin: 0 auto;
    }
    .branding-features {
      margin-top: 3rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .branding-feature {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem 1.25rem;
      background: rgba(255,255,255,0.1);
      border-radius: 1rem;
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255,255,255,0.1);
      font-size: 0.9rem;
      transition: all 0.3s ease;
    }
    .branding-feature:hover {
      background: rgba(255,255,255,0.18);
      transform: translateX(4px);
    }
    .branding-feature-icon {
      width: 36px; height: 36px;
      background: rgba(255,255,255,0.15);
      border-radius: 0.625rem;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.1rem;
      flex-shrink: 0;
    }
    /* Right form panel */
    .auth-form-side {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem 1rem;
      position: relative;
      z-index: 10;
    }
    .auth-card {
      width: 100%;
      max-width: 440px;
      background: rgba(255,255,255,0.75);
      backdrop-filter: blur(24px);
      -webkit-backdrop-filter: blur(24px);
      border: 1px solid rgba(255,255,255,0.5);
      border-radius: 1.75rem;
      box-shadow: 0 20px 60px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04);
      padding: 2.5rem;
      animation: cardEntry 0.7s cubic-bezier(0.16, 1, 0.3, 1) both;
    }
    @media (min-width: 640px) {
      .auth-card { padding: 3rem; }
    }
    .auth-logo-mobile {
      width: 80px; height: 80px;
      margin: 0 auto 1.5rem;
      object-fit: contain;
    }
    @media (min-width: 1024px) {
      .auth-logo-mobile { display: none; }
    }
    .auth-header {
      text-align: center;
      margin-bottom: 2rem;
    }
    .auth-header h1 {
      font-size: 1.75rem;
      font-weight: 800;
      color: #0f172a;
      margin-bottom: 0.5rem;
      letter-spacing: -0.02em;
    }
    .auth-header p {
      color: #64748b;
      font-size: 0.95rem;
    }
    /* Input group styling */
    .input-group { margin-bottom: 1.25rem; }
    .input-label {
      display: block;
      font-size: 0.8125rem;
      font-weight: 600;
      color: #475569;
      margin-bottom: 0.5rem;
      margin-left: 0.25rem;
    }
    .input-wrapper {
      position: relative;
    }
    .input-field {
      width: 100%;
      padding: 0.875rem 1.25rem;
      padding-left: 3rem;
      background: #f1f5f9;
      border: 2px solid transparent;
      border-radius: 1rem;
      font-size: 0.9375rem;
      color: #0f172a;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      outline: none;
    }
    .input-field::placeholder { color: #94a3b8; }
    .input-field:focus {
      background: #ffffff;
      border-color: #14b8a6;
      box-shadow: 0 0 0 4px rgba(20,184,166,0.1);
    }
    .input-icon {
      position: absolute;
      left: 1rem;
      top: 50%;
      transform: translateY(-50%);
      color: #94a3b8;
      transition: color 0.3s ease;
      pointer-events: none;
    }
    .input-wrapper:focus-within .input-icon { color: #14b8a6; }
    .input-action {
      position: absolute;
      right: 0.875rem;
      top: 50%;
      transform: translateY(-50%);
      background: none;
      border: none;
      color: #94a3b8;
      cursor: pointer;
      padding: 0.25rem;
      transition: color 0.2s ease;
      display: flex;
      align-items: center;
    }
    .input-action:hover { color: #0d9488; }
    .input-field--password { padding-right: 3rem; }
    /* Options row */
    .auth-options {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1.25rem;
      padding: 0 0.25rem;
      font-size: 0.8125rem;
    }
    .remember-label {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: #64748b;
      cursor: pointer;
    }
    .remember-label input[type="checkbox"] {
      width: 1rem; height: 1rem;
      border-radius: 0.25rem;
      accent-color: #0d9488;
      cursor: pointer;
    }
    .forgot-link {
      color: #0d9488;
      font-weight: 600;
      text-decoration: none;
      transition: color 0.2s ease;
    }
    .forgot-link:hover { color: #0f766e; }
    /* Submit button */
    .auth-submit {
      width: 100%;
      padding: 0.9375rem;
      background: linear-gradient(135deg, #0d9488, #0f766e);
      color: white;
      font-weight: 700;
      font-size: 0.9375rem;
      border: none;
      border-radius: 1rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.75rem;
      box-shadow: 0 4px 15px rgba(13,148,136,0.3);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
      overflow: hidden;
      margin-top: 0.5rem;
    }
    .auth-submit::before {
      content: '';
      position: absolute;
      top: 0; left: 0;
      width: 100%; height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent);
      background-size: 200% 100%;
      animation: shimmer 3s ease-in-out infinite;
    }
    .auth-submit:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(13,148,136,0.35);
    }
    .auth-submit:active:not(:disabled) {
      transform: translateY(0) scale(0.98);
    }
    .auth-submit:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    .auth-submit .spinner {
      width: 1.25rem; height: 1.25rem;
      border: 2px solid rgba(255,255,255,0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    /* Error alert */
    .auth-error {
      padding: 0.875rem 1rem;
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 1rem;
      color: #dc2626;
      font-size: 0.875rem;
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 1.25rem;
      animation: cardEntry 0.3s ease-out;
    }
    .auth-error svg { flex-shrink: 0; }
    /* Divider */
    .auth-divider {
      margin-top: 2rem;
      padding-top: 2rem;
      border-top: 1px solid #e2e8f0;
      text-align: center;
      font-size: 0.875rem;
      color: #64748b;
    }
    .auth-divider a {
      color: #0d9488;
      font-weight: 700;
      text-decoration: none;
      margin-left: 0.25rem;
      transition: color 0.2s ease;
    }
    .auth-divider a:hover { color: #0f766e; }
    /* Captcha wrapper */
    .captcha-wrapper {
      display: flex;
      justify-content: center;
      margin-bottom: 0.5rem;
    }
  `],
  template: `
    <div class="auth-page">
      <!-- Animated Background Orbs -->
      <div class="auth-orb auth-orb--1"></div>
      <div class="auth-orb auth-orb--2"></div>
      <div class="auth-orb auth-orb--3"></div>

      <!-- Left Branding Panel (Desktop) -->
      <div class="auth-branding">
        <div class="branding-float-1"></div>
        <div class="branding-float-2"></div>
        <div class="branding-content">
          <img src="/images/logo.png" alt="Workify Logo" class="branding-logo" />
          <h2 class="branding-title">Welcome to<br/>Workify</h2>
          <p class="branding-subtitle">Your all-in-one platform for connecting talent with opportunity.</p>
          <div class="branding-features">
            <div class="branding-feature">
              <div class="branding-feature-icon">🚀</div>
              <span>Find top freelance talent instantly</span>
            </div>
            <div class="branding-feature">
              <div class="branding-feature-icon">🤝</div>
              <span>Seamless project collaboration</span>
            </div>
            <div class="branding-feature">
              <div class="branding-feature-icon">📊</div>
              <span>AI-powered smart matching</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Right Form Panel -->
      <div class="auth-form-side">
        <div class="auth-card">
          <!-- Mobile Logo -->
          <img src="/images/logo.png" alt="Workify Logo" class="auth-logo-mobile" />

          <!-- Header -->
          <div class="auth-header">
            <h1>Welcome Back!</h1>
            <p>Sign in to your Workify account</p>
          </div>

          <form [formGroup]="loginForm" (ngSubmit)="onSubmit()">
            <!-- Error Alert -->
            <div *ngIf="error" class="auth-error">
              <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              {{ error }}
            </div>

            <!-- Email Field -->
            <div class="input-group">
              <label class="input-label">Email Address</label>
              <div class="input-wrapper">
                <div class="input-icon">
                  <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                </div>
                <input
                  type="email"
                  formControlName="email"
                  class="input-field"
                  placeholder="name@example.com"
                />
              </div>
            </div>

            <!-- Password Field -->
            <div class="input-group">
              <label class="input-label">Password</label>
              <div class="input-wrapper">
                <div class="input-icon">
                  <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                </div>
                <input
                  [type]="showPassword ? 'text' : 'password'"
                  formControlName="password"
                  class="input-field input-field--password"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  (click)="showPassword = !showPassword"
                  class="input-action"
                >
                  <svg *ngIf="!showPassword" width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  <svg *ngIf="showPassword" width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a10.025 10.025 0 014.132-5.411m0 0L21 21m-2.102-2.102L12 12m2.828-2.828A3 3 0 1111.172 14.828" />
                  </svg>
                </button>
              </div>
            </div>

            <!-- Options Row -->
            <div class="auth-options">
              <label class="remember-label">
                <input type="checkbox">
                Remember me
              </label>
              <a routerLink="/auth/forgot-password" class="forgot-link">Forgot password?</a>
            </div>

            <!-- reCAPTCHA -->
            <div class="captcha-wrapper">
              <re-captcha
                [siteKey]="environment.recaptcha.siteKey"
                (resolved)="onCaptchaResolved($any($event))"
              ></re-captcha>
            </div>

            <!-- Submit Button -->
            <button
              type="submit"
              [disabled]="loginForm.invalid || loading || !captchaResolved"
              class="auth-submit"
            >
              <span *ngIf="loading" class="spinner"></span>
              {{ loading ? 'Signing in...' : 'Sign In' }}
            </button>
          </form>

          <!-- Footer Link -->
          <div class="auth-divider">
            <p>Don't have an account?
              <a routerLink="/auth/register">Create account</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class AuthLoginComponent {
  loginForm: FormGroup;
  loading = false;
  error: string | null = null;
  showPassword = false;
  captchaResolved = false;
  captchaToken: string | null = null;
  environment = environment;

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router,
    private userProfileService: UserProfileService,
    private conversationService: ConversationService,
    private priorityNotif: PriorityNotificationService,
    private feedbackNotif: FeedbackNotificationService
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(4)]]
    });
  }

  onCaptchaResolved(token: string | null): void {
    this.captchaToken = token;
    this.captchaResolved = !!token;
  }

  onSubmit(): void {
    if (this.loginForm.invalid || !this.captchaResolved) return;

    this.loading = true;
    this.error = null;

    const loginData = {
      ...this.loginForm.value,
      recaptchaToken: this.captchaToken
    };

    this.auth.loginWithCredentials(loginData).subscribe({
      next: (res) => {
        this.auth.setToken(res.access_token);
        sessionStorage.setItem('pending_login_scan', '1');
        this.userProfileService.getMe().subscribe({
          next: profile => {
            this.auth.setNumericUserId(profile.id);
            this.conversationService.loadAllConversations(true);
            this.priorityNotif.connect(profile.id);
            this.priorityNotif.triggerLoginScan(profile.id);
            this.feedbackNotif.connect();
            this.loading = false;
            const role = this.auth.getRole();
            this.router.navigate([role === 'ADMIN' ? '/admin' : '/profile']);
          },
          error: () => {
            this.loading = false;
            this.router.navigate(['/profile']);
          }
        });
      },
      error: (err) => {
        this.loading = false;
        this.error = err.error?.error || "Incorrect email or password. Please try again.";
        console.error('Login error', err);
      }
    });
  }
}