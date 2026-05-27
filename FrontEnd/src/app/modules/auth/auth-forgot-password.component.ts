import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { finalize } from 'rxjs/operators';

@Component({
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, HttpClientModule],
  selector: 'app-auth-forgot-password',
  styles: [`
    @keyframes fpFloat {
      0%, 100% { transform: translate(0, 0) scale(1); }
      33% { transform: translate(30px, -20px) scale(1.05); }
      66% { transform: translate(-20px, 15px) scale(0.95); }
    }
    @keyframes fpShimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }
    @keyframes fpCardEntry {
      0% { opacity: 0; transform: translateY(30px) scale(0.97); }
      100% { opacity: 1; transform: translateY(0) scale(1); }
    }
    :host { display: block; }
    .fp-page {
      min-height: 100vh;
      display: flex;
      position: relative;
      overflow: hidden;
      background: linear-gradient(135deg, #f0fdfa 0%, #f8fafc 40%, #eef2ff 100%);
    }
    .fp-orb {
      position: absolute;
      border-radius: 50%;
      filter: blur(80px);
      animation: fpFloat 12s ease-in-out infinite;
      pointer-events: none;
    }
    .fp-orb--1 {
      width: 400px; height: 400px;
      background: radial-gradient(circle, rgba(13,148,136,0.15), transparent 70%);
      top: -10%; left: -5%;
    }
    .fp-orb--2 {
      width: 350px; height: 350px;
      background: radial-gradient(circle, rgba(79,70,229,0.1), transparent 70%);
      bottom: -10%; right: -5%;
      animation-delay: -4s;
    }
    /* Left branding */
    .fp-branding {
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
      .fp-branding { display: flex; }
    }
    .fp-branding::before {
      content: '';
      position: absolute;
      inset: 0;
      background: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.04'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
    }
    .fp-brand-float-1, .fp-brand-float-2 {
      position: absolute;
      border-radius: 50%;
      animation: fpFloat 10s ease-in-out infinite;
    }
    .fp-brand-float-1 {
      width: 200px; height: 200px;
      background: rgba(255,255,255,0.06);
      top: 10%; right: -40px;
      animation-delay: -2s;
    }
    .fp-brand-float-2 {
      width: 160px; height: 160px;
      background: rgba(255,255,255,0.04);
      bottom: 15%; left: -30px;
      animation-delay: -6s;
    }
    .fp-brand-content {
      position: relative;
      z-index: 10;
      text-align: center;
      color: white;
    }
    .fp-brand-icon {
      width: 80px; height: 80px;
      background: rgba(255,255,255,0.12);
      border-radius: 1.5rem;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 2rem;
      font-size: 2.5rem;
    }
    .fp-brand-title {
      font-size: 2rem;
      font-weight: 800;
      line-height: 1.2;
      margin-bottom: 1rem;
    }
    .fp-brand-subtitle {
      font-size: 1rem;
      opacity: 0.85;
      line-height: 1.6;
      max-width: 280px;
      margin: 0 auto;
    }
    /* Right side */
    .fp-form-side {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem 1rem;
      position: relative;
      z-index: 10;
    }
    .fp-card {
      width: 100%;
      max-width: 440px;
      background: rgba(255,255,255,0.75);
      backdrop-filter: blur(24px);
      -webkit-backdrop-filter: blur(24px);
      border: 1px solid rgba(255,255,255,0.5);
      border-radius: 1.75rem;
      box-shadow: 0 20px 60px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04);
      padding: 2.5rem;
      animation: fpCardEntry 0.7s cubic-bezier(0.16, 1, 0.3, 1) both;
    }
    @media (min-width: 640px) {
      .fp-card { padding: 3rem; }
    }
    .fp-header {
      text-align: center;
      margin-bottom: 2rem;
    }
    .fp-icon-badge {
      width: 64px; height: 64px;
      background: linear-gradient(135deg, #f0fdfa, #ccfbf1);
      border-radius: 1.25rem;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 1.25rem;
      box-shadow: 0 4px 12px rgba(13,148,136,0.1);
      color: #0d9488;
    }
    .fp-header h1 {
      font-size: 1.75rem;
      font-weight: 800;
      color: #0f172a;
      margin-bottom: 0.5rem;
      letter-spacing: -0.02em;
    }
    .fp-header p {
      color: #64748b;
      font-size: 0.9rem;
      line-height: 1.5;
    }
    .fp-alert {
      padding: 0.875rem 1rem;
      border-radius: 1rem;
      font-size: 0.875rem;
      margin-bottom: 1.5rem;
      animation: fpCardEntry 0.3s ease-out;
      text-align: center;
    }
    .fp-alert--success {
      background: #f0fdf4;
      color: #16a34a;
      border: 1px solid #bbf7d0;
    }
    .fp-alert--error {
      background: #fef2f2;
      color: #dc2626;
      border: 1px solid #fecaca;
    }
    .fp-input-group { margin-bottom: 1.5rem; }
    .fp-label {
      display: block;
      font-size: 0.8125rem;
      font-weight: 600;
      color: #475569;
      margin-bottom: 0.5rem;
      margin-left: 0.25rem;
    }
    .fp-input-wrapper { position: relative; }
    .fp-input {
      width: 100%;
      padding: 0.875rem 1.25rem 0.875rem 3rem;
      background: #f1f5f9;
      border: 2px solid transparent;
      border-radius: 1rem;
      font-size: 0.9375rem;
      color: #0f172a;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      outline: none;
    }
    .fp-input::placeholder { color: #94a3b8; }
    .fp-input:focus {
      background: white;
      border-color: #14b8a6;
      box-shadow: 0 0 0 4px rgba(20,184,166,0.1);
    }
    .fp-input-icon {
      position: absolute;
      left: 1rem;
      top: 50%;
      transform: translateY(-50%);
      color: #94a3b8;
      pointer-events: none;
      transition: color 0.3s ease;
    }
    .fp-input-wrapper:focus-within .fp-input-icon { color: #14b8a6; }
    .fp-submit {
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
    }
    .fp-submit::before {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent);
      background-size: 200% 100%;
      animation: fpShimmer 3s ease-in-out infinite;
    }
    .fp-submit:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(13,148,136,0.35);
    }
    .fp-submit:active:not(:disabled) { transform: translateY(0) scale(0.98); }
    .fp-submit:disabled { opacity: 0.6; cursor: not-allowed; }
    .fp-divider {
      margin-top: 2rem;
      padding-top: 2rem;
      border-top: 1px solid #e2e8f0;
      text-align: center;
      font-size: 0.875rem;
      color: #64748b;
    }
    .fp-divider a {
      color: #0d9488;
      font-weight: 700;
      text-decoration: none;
      margin-left: 0.25rem;
      transition: color 0.2s ease;
    }
    .fp-divider a:hover { color: #0f766e; }
  `],
  template: `
    <div class="fp-page">
      <!-- Background Orbs -->
      <div class="fp-orb fp-orb--1"></div>
      <div class="fp-orb fp-orb--2"></div>

      <!-- Left Branding Panel -->
      <div class="fp-branding">
        <div class="fp-brand-float-1"></div>
        <div class="fp-brand-float-2"></div>
        <div class="fp-brand-content">
          <div class="fp-brand-icon">🔐</div>
          <h2 class="fp-brand-title">Don't worry,<br/>we've got you!</h2>
          <p class="fp-brand-subtitle">We'll help you reset your password and get back to your projects in no time.</p>
        </div>
      </div>

      <!-- Right Form Panel -->
      <div class="fp-form-side">
        <div class="fp-card">
          <!-- Header -->
          <div class="fp-header">
            <div class="fp-icon-badge">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
              </svg>
            </div>
            <h1>Forgot Password?</h1>
            <p>Enter your email and we'll send you instructions to reset your password.</p>
          </div>

          <div *ngIf="successMessage" class="fp-alert fp-alert--success">
            {{ successMessage }}
          </div>

          <div *ngIf="errorMessage" class="fp-alert fp-alert--error">
            {{ errorMessage }}
          </div>

          <form *ngIf="!successMessage" [formGroup]="forgotForm" (ngSubmit)="onSubmit()">
            <div class="fp-input-group">
              <label class="fp-label">Email Address</label>
              <div class="fp-input-wrapper">
                <div class="fp-input-icon">
                  <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                </div>
                <input
                  type="email"
                  formControlName="email"
                  class="fp-input"
                  placeholder="name@example.com"
                />
              </div>
            </div>

            <button
              type="submit"
              [disabled]="forgotForm.invalid || loading"
              class="fp-submit"
            >
              {{ loading ? 'Sending...' : 'Send Reset Link' }}
            </button>
          </form>

          <div class="fp-divider">
            <p>Remember your password?
              <a routerLink="/auth/login">Back to Sign In</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class AuthForgotPasswordComponent {
  forgotForm: FormGroup;
  loading = false;
  successMessage: string | null = null;
  errorMessage: string | null = null;

  constructor(
    private fb: FormBuilder,
    private http: HttpClient
  ) {
    this.forgotForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
    });
  }


  onSubmit(): void {
    if (this.forgotForm.invalid) return;
    this.loading = true;
    this.errorMessage = null;

    this.http.post(`${environment.apiBaseUrl}/api/auth/forgot-password`, {
      email: this.forgotForm.get('email')?.value
    }).pipe(
      finalize(() => this.loading = false)
    ).subscribe({
      next: (res: any) => {
        this.successMessage = res.message;
      },
      error: (err) => {
        this.errorMessage = err.error?.error || 'An error occurred. Please try again.';
      }
    });
  }
}
