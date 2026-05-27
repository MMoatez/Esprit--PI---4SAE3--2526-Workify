import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { projects, Project, freelancers, Freelancer } from '../../../../data/mockData';

@Component({
  selector: 'app-project-details',
  templateUrl: './project-details.component.html',
  styleUrls: ['./project-details.component.css']
})
export class ProjectDetailsComponent implements OnInit {
  project: Project | undefined;
  projectId: string = '';
  recommendedFreelancers: (Freelancer & { matchScore: number })[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.projectId = params['id'];
      this.project = projects.find(p => p.id === this.projectId);
      
      if (this.project) {
        this.loadRecommendedFreelancers();
      }
    });
  }

  loadRecommendedFreelancers(): void {
    // Generate match scores based on skill matching
    this.recommendedFreelancers = freelancers.slice(0, 3).map(freelancer => {
      // Calculate match score based on skills overlap
      const projectSkills = this.project?.skills || [];
      const matchingSkills = freelancer.skills.filter(skill => 
        projectSkills.some(ps => ps.toLowerCase().includes(skill.toLowerCase()) || 
                                 skill.toLowerCase().includes(ps.toLowerCase()))
      );
      
      // Base score + bonus for matching skills
      let matchScore = 75 + Math.floor(Math.random() * 15);
      matchScore += matchingSkills.length * 5;
      matchScore = Math.min(matchScore, 99); // Cap at 99%
      
      return {
        ...freelancer,
        matchScore
      };
    }).sort((a, b) => b.matchScore - a.matchScore); // Sort by match score
  }

  goBack(): void {
    this.router.navigate(['/projects']);
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }

  viewFreelancerProfile(freelancerId: string): void {
    // Navigate to freelancer profile (to be implemented)
    console.log('View freelancer:', freelancerId);
  }

  inviteFreelancer(freelancerId: string): void {
    // Invite freelancer to project (to be implemented)
    console.log('Invite freelancer:', freelancerId);
  }
}