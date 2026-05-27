import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const adminGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isLoggedIn() && (authService.getRole() === 'ADMIN' || authService.getRole() === 'PARTNER')) {
    return true;
  }

  // If logged in but not admin, redirect to home or unauthorized page
  if (authService.isLoggedIn()) {
    router.navigate(['/']);
    return false;
  }

  // If not logged in, redirect to login
  router.navigate(['/auth/login']);
  return false;
};
