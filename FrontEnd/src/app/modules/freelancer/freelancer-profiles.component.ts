import { Component } from '@angular/core';
import { Freelancer, categories, freelancers } from './data/freelancer-mock-data';
import { UserProfileService } from '../../core/services/user-profile.service';
import { UserProfile } from '../../core/models/user-profile.model';
import { ConversationService } from '../../core/services/conversation.service';
import { CreateConversationDTO } from '../../core/models/conversation.model';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  standalone: false,
  selector: 'app-freelancer-profiles',
  templateUrl: './freelancer-profiles.component.html',
  styleUrls: ['./freelancer-profiles.component.scss']
})
export class FreelancerProfilesComponent {
  searchTerm: string = '';
  selectedCategory: string = 'All Categories';
  rateRange: [number, number] = [0, 150];
  sortBy: 'match' | 'rating' | 'rate' = 'match';

  categories = categories;
  freelancers: any[] = []; // Raw data from API
  freelancersWithScores: any[] = [];
  filteredFreelancers: any[] = [];
  loading = true;
  error: string | null = null;

  constructor(
    private userProfileService: UserProfileService,
    private conversationService: ConversationService,
    private authService: AuthService,
    private router: Router
  ) {
    this.loadFreelancers();
  }

  loadFreelancers() {
    this.loading = true;
    this.userProfileService.getPublicFreelancers().subscribe({
      next: (data) => {
        this.freelancers = data;
        // Map backend data to UI format if needed, or use directly
        // For now, let's adapt it to fit the existing UI structure or just pass it through
        const titles = ['Senior Full Stack Developer', 'UI/UX Designer', 'DevOps Engineer', 'Mobile App Developer', 'Digital Marketer', 'Content Writer'];

        this.freelancersWithScores = this.freelancers.map(f => {
          const randomTitle = titles[Math.floor(Math.random() * titles.length)];
          return {
            ...f,
            // Add mock fields for UI demo if missing in backend
            title: f.title || randomTitle,
            rating: 4.0 + Math.random(),
            reviews: Math.floor(Math.random() * 50) + 1,
            hourlyRate: f.hourlyRate || Math.floor(Math.random() * 100) + 20,
            matchScore: Math.floor(Math.random() * 20) + 80,
            skills: f.competences?.length ? f.competences.map((c: any) => c.name) : ['Angular', 'Java', 'Spring Boot'],
            bio: f.bio || `Experienced ${randomTitle} with a proven track record of delivering high-quality solutions. Specialized in building scalable applications.`,
            location: f.location || 'Remote',
            avatar: this.userProfileService.getAvatarUrl(f.profilePicture) || `https://ui-avatars.com/api/?name=${f.firstName}+${f.lastName}&background=random`,
            dicebearAvatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${f.email || f.firstName || 'user' + f.id}`,
            hasProfilePicture: !!f.profilePicture
          };
        });
        this.filterAndSortFreelancers();
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load freelancers', err);
        this.error = 'Failed to load freelancers';
        this.loading = false;
      }
    });
  }

  onSearchChange(value: string): void {
    this.searchTerm = value;
    this.filterAndSortFreelancers();
  }

  onCategoryChange(category: string): void {
    this.selectedCategory = category;
    this.filterAndSortFreelancers();
  }

  onRateChange(value: number): void {
    this.rateRange = [this.rateRange[0], value];
    this.filterAndSortFreelancers();
  }

  onSortChange(value: string): void {
    this.sortBy = value as 'match' | 'rating' | 'rate';
    this.filterAndSortFreelancers();
  }

  filterAndSortFreelancers(): void {
    let filtered = this.freelancersWithScores.filter(freelancer => {
      const matchesSearch =
        (freelancer.firstName + ' ' + freelancer.lastName).toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        freelancer.title.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        freelancer.bio.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        freelancer.skills.some((skill: string) =>
          skill.toLowerCase().includes(this.searchTerm.toLowerCase())
        );

      // Category filtering might need adjustment based on real data
      const matchesCategory =
        this.selectedCategory === 'All Categories' ||
        freelancer.title.toLowerCase().includes(this.selectedCategory.toLowerCase());

      const matchesRate =
        freelancer.hourlyRate >= this.rateRange[0] && freelancer.hourlyRate <= this.rateRange[1];

      return matchesSearch && matchesCategory && matchesRate;
    });

    if (this.sortBy === 'rating') {
      filtered.sort((a, b) => b.rating - a.rating);
    } else if (this.sortBy === 'rate') {
      filtered.sort((a, b) => a.hourlyRate - b.hourlyRate);
    } else {
      filtered.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
    }

    this.filteredFreelancers = filtered;
  }

  getSkillsToShow(skills: string[]): string[] {
    return skills.slice(0, 4);
  }

  getAdditionalSkillsCount(skills: string[]): number {
    return Math.max(0, skills.length - 4);
  }

  sendMessage(freelancer: any, event: Event): void {
    event.stopPropagation();
    const conversationData: CreateConversationDTO = {
      receiverId: freelancer.id,
      title: `Chat with ${freelancer.firstName} ${freelancer.lastName}`,
      emojiIcon: '💬'
    };

    this.conversationService.createConversation(conversationData).subscribe({
      next: (newConversation) => {
        this.router.navigate(['/communication', newConversation.id]);
      },
      error: (err) => {
        if (err.isBlocked && err.conversation) {
          this.router.navigate(['/communication', err.conversation.id]);
          return;
        }
        let errorMessage = 'Impossible de créer la conversation.';
        if (err.status === 0) errorMessage += ' Le serveur backend ne répond pas.';
        else if (err.status === 404) errorMessage += " L'endpoint n'existe pas.";
        else if (err.status === 500) errorMessage += ' Erreur serveur.';
        else if (err.error?.message) errorMessage += ' ' + err.error.message;
        alert(errorMessage);
      }
    });
  }
}
