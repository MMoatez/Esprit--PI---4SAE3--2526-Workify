import { Component, OnInit } from '@angular/core';
import { AdminService, UserProfile } from '../../services/admin.service';
import { UserProfileService } from '../../../../core/services/user-profile.service';

@Component({
  selector: 'app-user-list',
  standalone: false,
  templateUrl: './user-list.component.html',
  styleUrl: './user-list.component.scss'
})
export class UserListComponent implements OnInit {
  users: UserProfile[] = [];
  totalElements = 0;
  totalPages = 0;
  currentPage = 0;
  pageSize = 10;
  searchTerm = '';
  isLoading = false;

  constructor(
    private adminService: AdminService,
    private userProfileService: UserProfileService
  ) { }

  ngOnInit() {
    this.loadUsers();
  }

  loadUsers() {
    this.isLoading = true;
    this.adminService.getUsers(this.currentPage, this.pageSize, this.searchTerm)
      .subscribe({
        next: (response) => {
          console.log('API Response:', response);
          this.users = response.content;
          this.totalElements = response.totalElements;
          this.totalPages = response.totalPages;
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Failed to load users', err);
          this.isLoading = false;
        }
      });
  }

  onSearch() {
    this.currentPage = 0;
    this.loadUsers();
  }

  onPageChange(page: number) {
    this.currentPage = page;
    this.loadUsers();
  }

  toggleStatus(user: UserProfile): void {
    if (confirm(`Are you sure you want to ${user.accountStatus === 'ACTIVE' ? 'block' : 'unblock'} this user?`)) {
      this.adminService.toggleUserStatus(user.id).subscribe({
        next: (updatedUser) => {
          const index = this.users.findIndex(u => u.id === updatedUser.id);
          if (index !== -1) {
            this.users[index] = updatedUser;
          }
        },
        error: (err) => {
          console.error('Error toggling user status', err);
        }
      });
    }
  }

  getInitials(user: UserProfile): string {
    if (user.firstName && user.lastName) {
      return (user.firstName.charAt(0) + user.lastName.charAt(0)).toUpperCase();
    }
    if (user.firstName) {
      return user.firstName.charAt(0).toUpperCase();
    }
    if (user.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return '?';
  }
  
  getAvatarUrl(user: UserProfile): string | null {
    return this.userProfileService.getAvatarUrl(user.profilePicture || null);
  }
}
