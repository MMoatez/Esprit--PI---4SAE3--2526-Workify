import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { UserProfileService } from 'src/app/core/services/user-profile.service';
import { Router } from '@angular/router';
import { ConversationService } from 'src/app/core/services/conversation.service';
import { CreateConversationDTO } from 'src/app/core/models/conversation.model';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FeedbackModule } from '../../feedback/feedback.module';

@Component({
  selector: 'app-freelancer-profile',
  standalone: true,
  imports: [CommonModule, RouterModule, FeedbackModule],
  templateUrl: './freelancer-profile.component.html',
  styleUrls: ['./freelancer-profile.component.scss']
})
export class FreelancerProfileComponent implements OnInit {
  freelancer: any;
  freelancerId: number | null = null;
  loading = true;
  error: string | null = null;
  reviews: any[] = [];
  hasProfilePicture = false;
  showResumeModal = false;

  constructor(
    private route: ActivatedRoute,
    private userProfileService: UserProfileService,
    private conversationService: ConversationService,
    private router: Router,
    private sanitizer: DomSanitizer
  ) { }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.freelancerId = +id;
      this.loadFreelancer(+id);
    } else {
      this.error = 'Freelancer not found';
      this.loading = false;
    }
  }

  loadFreelancer(id: number) {
    this.userProfileService.getFreelancerById(id).subscribe({
      next: (data) => {
        // Enrich data with mock fields for premium look
        this.freelancer = {
          ...data,
          title: data.title || 'Senior Full Stack Developer', // Fallback
          rating: 4.8, // Mock
          reviewsCount: 124, // Mock
          hourlyRate: data.hourlyRate || 85, // Fallback
          bio: data.bio || `Experienced software engineer with a passion for building scalable web applications. 
                Specialized in Angular and Spring Boot architectures. Committed to delivering high-quality 
                code and exceptional user experiences.`,
          location: data.location || 'Paris, France', // Fallback
          joinedDate: data.inscriptionDate ? new Date(data.inscriptionDate) : new Date(),
          languages: ['English', 'French', 'Spanish'], // Mock
          responseTime: '< 1 hour', // Mock
          successRate: 98, // Mock
          completedProjects: 45, // Mock
          // Avatar: resolve full URL; only set if profilePicture is present
          avatar: data.profilePicture ? this.userProfileService.getAvatarUrl(data.profilePicture) : null,
          dicebearAvatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(data.email || data.firstName || 'freelancer')}`,
          skills: data.competences?.map((c: any) => c.name) || [],
          educations: data.educations || [],
          experiences: data.experiences || [],
          cvPdfUrl: this.userProfileService.getCvPdfUrl(data.cvPdf)
        };
        console.log('Public profile: avatar=', this.freelancer.avatar, '| cvPdf=', this.freelancer.cvPdfUrl);

        this.hasProfilePicture = !!data.profilePicture;

        // Generate dummy reviews
        this.reviews = [
          {
            author: 'Alice Smith',
            date: '2 months ago',
            rating: 5,
            comment: 'Excellent work! Delivered on time and exceeded expectations.'
          },
          {
            author: 'John Doe',
            date: '3 months ago',
            rating: 5,
            comment: 'Great communication and technical skills. Highly recommended.'
          },
          {
            author: 'Tech Corp Inc.',
            date: '5 months ago',
            rating: 4,
            comment: 'Very professional. Solved our complex backend issues efficiently.'
          }
        ];

        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load freelancer', err);
        this.error = 'Failed to load freelancer profile.';
        this.loading = false;
      }
    });
  }

  getStars(rating: number): number[] {
    return Array(Math.round(rating)).fill(0);
  }

  getEmptyStars(rating: number): number[] {
    return Array(5 - Math.round(rating)).fill(0);
  }

  sendMessage(): void {
    if (!this.freelancer?.id) return;

    const dto: CreateConversationDTO = {
      receiverId: this.freelancer.id,
      title: `Chat with ${this.freelancer.firstName ?? ''} ${this.freelancer.lastName ?? ''}`.trim(),
      emojiIcon: '💬'
    };

    this.conversationService.createConversation(dto).subscribe({
      next: (conv) => this.router.navigate(['/communication', conv.id]),
      error: (err) => {
        console.error('❌ sendMessage (freelancer-profile)', err);
        alert('Impossible d\'ouvrir la conversation.');
      }
    });
  }

  viewResume() {
    if (this.freelancer?.cvPdfUrl) {
      this.showResumeModal = true;
    } else {
      alert('This freelancer has not uploaded a resume PDF yet.');
    }
  }

  closeResumeModal() {
    this.showResumeModal = false;
  }

  get safeCvPdfUrl(): SafeResourceUrl | null {
    if (!this.freelancer?.cvPdfUrl) return null;
    return this.sanitizer.bypassSecurityTrustResourceUrl(this.freelancer.cvPdfUrl);
  }

  /** If the avatar image fails to load (404, etc.), clear it so the initials placeholder shows. */
  onAvatarError(event: Event): void {
    console.warn('Avatar image failed to load, falling back to initials');
    if (this.freelancer) {
      this.freelancer.avatar = null;
      this.hasProfilePicture = false;
    }
  }
}
