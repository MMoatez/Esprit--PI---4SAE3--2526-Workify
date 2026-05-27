import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const superAdminGuard: CanActivateFn = (route, state) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    if (authService.isLoggedIn() && authService.getRole() === 'ADMIN') {
        return true;
    }

    // If logged in but is partner, redirect to partner dashboard
    if (authService.isLoggedIn() && authService.getRole() === 'PARTNER') {
        router.navigate(['/admin/partner-dashboard']);
        return false;
    }

    // If not admin and not partner, redirect back
    if (authService.isLoggedIn()) {
        router.navigate(['/']);
        return false;
    }

    // If not logged in, redirect to login
    router.navigate(['/auth/login']);
    return false;
};
