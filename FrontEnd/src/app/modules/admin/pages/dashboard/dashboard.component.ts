import { Component, OnInit } from '@angular/core';
import { AdminService, AdminStatistics, UserProfile } from '../../services/admin.service';
import { forkJoin } from 'rxjs';
import { AuthService } from '../../../../core/services/auth.service';
import { UserProfileService } from '../../../../core/services/user-profile.service';
import { EventAnalyticsComponent } from './event-analytics.component';

@Component({
  selector: 'app-dashboard',
  standalone: false,
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {
  stats: AdminStatistics | null = null;
  recentUsers: UserProfile[] = [];
  isLoading = true;
  today = new Date();

  constructor(
    private adminService: AdminService,
    public auth: AuthService,
    private userProfileService: UserProfileService
  ) { }

  ngOnInit() {
    forkJoin({
      stats: this.adminService.getStatistics(),
      users: this.adminService.getRecentUsers()
    }).subscribe({
      next: ({ stats, users }) => {
        console.log('Admin Dashboard Stats Received:', stats);
        this.stats = stats;
        this.recentUsers = users.content;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to load dashboard data', err);
        this.isLoading = false;
      }
    });
  }

  getRoleBarWidth(count: number): string {
    if (!this.stats || !this.stats.totalUsers || isNaN(count)) return '0%';
    const percentage = Math.round((count / this.stats.totalUsers) * 100);
    return Math.min(100, Math.max(0, percentage)) + '%';
  }

  getArcDash(rate: number): string {
    if (isNaN(rate) || rate === undefined || rate === null) return '0 251.3';
    // Circle circumference for r=40: 2πr ≈ 251.3
    const circ = 251.3;
    const filled = (Math.min(100, Math.max(0, rate)) / 100) * circ;
    return `${filled} ${circ - filled}`;
  }

  getInitials(user: UserProfile): string {
    const f = user.firstName?.[0] ?? '';
    const l = user.lastName?.[0] ?? '';
    return (f + l).toUpperCase() || '?';
  }

  getRoleBadgeClass(role: string): string {
    switch (role) {
      case 'FREELANCER': return 'badge-purple';
      case 'CLIENT': return 'badge-blue';
      case 'PARTNER': return 'badge-teal';
      case 'ADMIN': return 'badge-slate';
      default: return 'badge-slate';
    }
  }

  getAvatarUrl(user: UserProfile): string | null {
    return this.userProfileService.getAvatarUrl(user.profilePicture || null);
  }
}
