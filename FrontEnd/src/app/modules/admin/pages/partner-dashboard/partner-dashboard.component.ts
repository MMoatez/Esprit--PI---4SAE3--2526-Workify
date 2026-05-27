import { Component, OnInit } from '@angular/core';
import { AdminService, PartnerStatistics } from '../../services/admin.service';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-partner-dashboard',
  standalone: false,
  templateUrl: './partner-dashboard.component.html',
  styleUrl: './partner-dashboard.component.scss'
})
export class PartnerDashboardComponent implements OnInit {
  stats: PartnerStatistics | null = null;
  isLoading = true;
  today = new Date();

  constructor(
    private adminService: AdminService,
    public auth: AuthService
  ) { }

  ngOnInit(): void {
    this.adminService.getPartnerStatistics().subscribe({
      next: (data) => {
        this.stats = data;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to load partner statistics', err);
        this.isLoading = false;
      }
    });
  }
}
