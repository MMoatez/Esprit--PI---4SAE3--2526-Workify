import { Component, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthService } from './core/services/auth.service';
import { FeedbackNotificationService } from './core/services/feedback-notification.service';
import { UserProfileService } from './core/services/user-profile.service';
import { SubscriptionService } from './core/services/subscription.service';
import { SubscriptionResponse } from './core/models/subscription.model';

@Component({
  standalone: false,
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  title = 'workify';
  mobileMenuOpen = false;
  learningMenuOpen = false;
  userMenuOpen = false;
  currentPath = '';
  userRole: string | null = null;
  headerUserName = 'User';
  headerUserInitials = 'U';
  activeSubscription: SubscriptionResponse | null = null;
  remainingDays: number | null = null;
  private lastSubscriptionUserId: number | null = null;

  constructor(
    private router: Router,
    public auth: AuthService,
    private feedbackNotif: FeedbackNotificationService,
    private profileService: UserProfileService,
    private subscriptionService: SubscriptionService,
  ) {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      this.currentPath = event.url;
      this.mobileMenuOpen = false;
      this.userMenuOpen = false;
      // Refresh role on every navigation (handles login/logout without page reload)
      this.refreshRole();
    });
  }

  ngOnInit(): void {
    if (this.auth.isLoggedIn()) {
      this.auth.startSessionKeeper();
      this.feedbackNotif.connect();
      this.headerUserName = this.auth.getUserName() || this.headerUserName;
      this.headerUserInitials = this.computeInitials(this.headerUserName);
    }
    this.refreshRole();
  }

  private refreshRole(): void {
    if (!this.auth.isLoggedIn()) {
      this.userRole = null;
      this.activeSubscription = null;
      this.remainingDays = null;
      this.lastSubscriptionUserId = null;
      return;
    }

    // Use stored role immediately (avoids flicker)
    const stored = localStorage.getItem('workify_role');
    if (stored) this.userRole = stored;

    // Always refresh from API for accuracy
    this.profileService.getMe().subscribe({
      next: (profile) => {
        if (profile?.role) {
          const r = profile.role.toString().toUpperCase();
          localStorage.setItem('workify_role', r);
          this.userRole = r;
        }
        if (profile?.id) {
          localStorage.setItem('workify_numeric_id', profile.id.toString());
          this.loadActiveSubscription(profile.id);
        }
        const fullName = [profile?.firstName, profile?.lastName].filter(Boolean).join(' ').trim();
        this.headerUserName = fullName || this.auth.getUserName() || 'User';
        this.headerUserInitials = this.computeInitials(this.headerUserName);
      },
      error: () => {
        this.userRole = stored || null;
        this.headerUserName = this.auth.getUserName() || 'User';
        this.headerUserInitials = this.computeInitials(this.headerUserName);
        const numericId = this.auth.getNumericUserId();
        if (numericId) {
          this.loadActiveSubscription(numericId);
        }
      }
    });
  }

  get activePackSummary(): string | null {
    if (!this.activeSubscription?.packName) {
      return null;
    }
    if (this.remainingDays === null) {
      return this.activeSubscription.packName;
    }
    return `${this.activeSubscription.packName} - ${this.remainingDays} day(s) left`;
  }

  isActive(path: string): boolean {
    if (path === '/') {
      return this.currentPath === '/';
    }
    return this.currentPath.startsWith(path);
  }

  toggleMobileMenu(): void {
    this.mobileMenuOpen = !this.mobileMenuOpen;
  }

  toggleLearningMenu(): void {
    this.learningMenuOpen = !this.learningMenuOpen;
  }

  toggleUserMenu(): void {
    this.userMenuOpen = !this.userMenuOpen;
  }

  closeUserMenu(): void {
    this.userMenuOpen = false;
  }

  logout(): void {
    this.userRole = null;
    this.userMenuOpen = false;
    this.activeSubscription = null;
    this.remainingDays = null;
    this.lastSubscriptionUserId = null;
    this.auth.logout();
  }

  private loadActiveSubscription(userId: number): void {
    if (this.lastSubscriptionUserId === userId) {
      return;
    }
    this.lastSubscriptionUserId = userId;

    this.subscriptionService.getActiveSubscriptionOrNull(userId).subscribe({
      next: (sub) => {
        this.activeSubscription = sub;
        this.remainingDays = sub ? this.computeRemainingDays(sub.endDate) : null;
      },
      error: () => {
        this.activeSubscription = null;
        this.remainingDays = null;
      }
    });
  }

  private computeRemainingDays(endDate: string | null): number | null {
    if (!endDate) {
      return null;
    }
    const end = new Date(endDate);
    if (Number.isNaN(end.getTime())) {
      return null;
    }
    const diffMs = end.getTime() - Date.now();
    const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    return Math.max(0, days);
  }

  private computeInitials(name: string): string {
    const parts = (name || '').trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) {
      return 'U';
    }
    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
}
