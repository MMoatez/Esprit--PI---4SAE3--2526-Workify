import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { UserProfileService } from '../../core/services/user-profile.service';
import { ConversationService } from '../../core/services/conversation.service';
import { CreateConversationDTO } from '../../core/models/conversation.model';

interface ClientWithUI {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  profilePicture?: string;
  bio?: string;
  title: string;
  location: string;
  avatar: string;
  projectCount?: number;
  budget?: number;
  memberSince?: string;
  competences?: any[];
}

@Component({
  standalone: false,
  selector: 'app-client-profiles',
  templateUrl: './client-profiles.component.html',
  styleUrls: ['./client-profiles.component.scss']
})
export class ClientProfilesComponent implements OnInit {
  searchTerm: string = '';
  sortBy: 'name' | 'newest' = 'name';

  clients: any[] = [];
  clientsWithUI: ClientWithUI[] = [];
  filteredClients: ClientWithUI[] = [];
  loading = true;
  error: string | null = null;

  constructor(
    private userProfileService: UserProfileService,
    private conversationService: ConversationService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadClients();
  }

  loadClients(): void {
    this.loading = true;
    this.error = null;
    this.userProfileService.getPublicClients().subscribe({
      next: (data) => {
        this.clients = data && data.length > 0 ? data : [];

        const industries = [
          'Tech & Software',
          'E-Commerce',
          'Media & Content',
          'Finance & Fintech',
          'Healthcare',
          'Education'
        ];

        this.clientsWithUI = this.clients.map(c => ({
          ...c,
          title: c.title || industries[Math.floor(Math.random() * industries.length)],
          bio: c.bio || `Looking for talented freelancers to help grow my business and bring projects to life.`,
          location: c.location || 'Remote',
          avatar: this.userProfileService.getAvatarUrl(c.profilePicture)
            || `https://ui-avatars.com/api/?name=${c.firstName || 'C'}+${c.lastName || 'L'}&background=4f46e5&color=fff&size=128`,
          projectCount: Math.floor(Math.random() * 15) + 1,
          budget: Math.floor(Math.random() * 9) * 500 + 500,
          memberSince: new Date(c.inscriptionDate || Date.now()).getFullYear().toString()
        }));

        this.filterAndSort();
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load clients', err);
        this.error = 'Could not load client list. Please check your connection and try again.';
        this.clients = [];
        this.clientsWithUI = [];
        this.filteredClients = [];
        this.loading = false;
      }
    });
  }

  onSearchChange(value: string): void {
    this.searchTerm = value;
    this.filterAndSort();
  }

  onSortChange(value: string): void {
    this.sortBy = value as 'name' | 'newest';
    this.filterAndSort();
  }

  filterAndSort(): void {
    let filtered = this.clientsWithUI.filter(client => {
      const term = this.searchTerm.toLowerCase();
      return !term ||
        (client.firstName + ' ' + client.lastName).toLowerCase().includes(term) ||
        (client.title || '').toLowerCase().includes(term) ||
        (client.bio || '').toLowerCase().includes(term) ||
        (client.location || '').toLowerCase().includes(term);
    });

    if (this.sortBy === 'name') {
      filtered.sort((a, b) => (a.firstName || '').localeCompare(b.firstName || ''));
    }

    this.filteredClients = filtered;
  }

  sendMessage(client: ClientWithUI, event: Event): void {
    event.stopPropagation();
    const data: CreateConversationDTO = {
      receiverId: client.id,
      title: `Chat with ${client.firstName} ${client.lastName}`,
      emojiIcon: '💬'
    };
    this.conversationService.createConversation(data).subscribe({
      next: (conv) => {
        this.router.navigate(['/communication', conv.id]);
      },
      error: (err) => {
        if (err?.isBlocked && err?.conversation) {
          this.router.navigate(['/communication', err.conversation.id]);
          return;
        }
        alert('Could not start conversation. Please try again.');
      }
    });
  }
}
