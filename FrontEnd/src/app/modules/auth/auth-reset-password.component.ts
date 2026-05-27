import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { finalize } from 'rxjs/operators';

@Component({
   standalone: true,
   imports: [CommonModule, ReactiveFormsModule, RouterModule, HttpClientModule],
   selector: 'app-auth-reset-password',
   template: `
    <div class="min-h-screen flex items-center justify-center bg-slate-50 relative overflow-hidden">
  
      <div class="absolute inset-0 pointer-events-none opacity-20" 
           style="background-image: radial-gradient(#64748b 1px, transparent 1px); background-size: 24px 24px;">
      </div>

      <div class="w-full max-w-lg p-4 animate-slide-up relative z-10 text-center">
         <!-- Logo Header -->
         <div class="mb-8 py-4">
            <h1 class="text-4xl font-extrabold tracking-tight">
               <span style="color: #00C3A5;">Work</span><span style="color: #FF7A00;">ify</span>
            </h1>
         </div>

         <div class="bg-white rounded-3xl shadow-xl overflow-hidden p-10 md:p-14 border border-slate-100">
            <h2 class="text-2xl font-bold text-[#002D44] mb-10">Nouveau mot de passe</h2>

            <div *ngIf="successMessage" class="mb-8 p-6 bg-green-50 border border-green-200 text-green-700 rounded-2xl text-center font-medium">
               {{ successMessage }}<br>
               <span class="text-sm mt-2 block">Redirecting to login...</span>
            </div>

            <div *ngIf="errorMessage" class="mb-8 p-6 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-center font-medium">
               {{ errorMessage }}
            </div>

            <form *ngIf="!successMessage" [formGroup]="resetForm" (ngSubmit)="onSubmit()" class="space-y-8 text-left">
               <div class="space-y-3">
                  <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Email</label>
                  <input
                    type="text"
                    [value]="emailFromLink || '...'"
                    disabled
                    class="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-slate-400 font-medium cursor-not-allowed"
                  />
               </div>

               <div class="space-y-3">
                  <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Nouveau mot de passe *</label>
                  <div class="relative group">
                     <input
                       [type]="showPassword ? 'text' : 'password'"
                       formControlName="password"
                       class="w-full px-5 py-4 bg-white border-2 border-slate-100 rounded-2xl focus:border-[#00C3A5] transition-all outline-none text-slate-900 placeholder:text-slate-300"
                       placeholder="••••••••"
                     />
                     <button type="button" (click)="showPassword = !showPassword" 
                             class="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        <svg *ngIf="!showPassword" class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                        <svg *ngIf="showPassword" class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.888 9.888L3 3m18 18l-6.888-6.888"></path></svg>
                     </button>
                  </div>
                  <div *ngIf="resetForm.get('password')?.touched && resetForm.get('password')?.invalid" class="text-xs text-red-500 ml-1">
                     Password must be at least 8 characters long.
                  </div>
               </div>

               <button
                 type="submit"
                 [disabled]="resetForm.invalid || loading"
                 class="w-full py-5 bg-[#002D44] text-white font-bold rounded-2xl shadow-lg hover:bg-[#001A29] transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed text-lg"
               >
                 {{ loading ? 'Updating...' : 'Réinitialiser le mot de passe' }}
               </button>

               <div class="pt-6 border-t border-slate-50 text-right">
                  <a routerLink="/auth/login" class="text-sm font-bold text-[#002D44] hover:underline decoration-2 underline-offset-4">
                     Retour au site
                  </a>
               </div>
            </form>
         </div>
      </div>
    </div>
  `,
})
export class AuthResetPasswordComponent implements OnInit {
   resetForm: FormGroup;
   loading = false;
   successMessage: string | null = null;
   errorMessage: string | null = null;
   showPassword = false;
   token: string | null = null;
   emailFromLink: string | null = null; // Mocked for UI consistency

   constructor(
      private fb: FormBuilder,
      private route: ActivatedRoute,
      private router: Router,
      private http: HttpClient
   ) {
      this.resetForm = this.fb.group({
         password: ['', [Validators.required, Validators.minLength(8)]],
      });
   }

   ngOnInit(): void {
      this.token = this.route.snapshot.queryParamMap.get('token');
      if (!this.token) {
         this.errorMessage = 'Invalid or missing reset token.';
      } else {
         this.validateToken();
      }
   }

   validateToken(): void {
      if (!this.token) return;
      this.http.get(`${environment.apiBaseUrl}/api/auth/validate-token?token=${this.token}`)
         .subscribe({
            next: (res: any) => {
               this.emailFromLink = res.email;
            },
            error: (err) => {
               this.errorMessage = err.error?.error || 'Your reset link is invalid or has expired.';
            }
         });
   }

   onSubmit(): void {
      if (this.resetForm.invalid || !this.token) return;
      this.loading = true;
      this.errorMessage = null;

      this.http.post(`${environment.apiBaseUrl}/api/auth/reset-password`, {
         token: this.token,
         password: this.resetForm.get('password')?.value
      }).pipe(
         finalize(() => this.loading = false)
      ).subscribe({
         next: (res: any) => {
            this.successMessage = res.message;
            setTimeout(() => this.router.navigate(['/auth/login']), 3000);
         },
         error: (err) => {
            this.errorMessage = err.error?.error || 'Failed to reset password. The link may have expired.';
         }
      });
   }
}
