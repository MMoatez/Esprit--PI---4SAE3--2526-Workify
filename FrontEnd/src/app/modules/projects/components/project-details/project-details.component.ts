import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { projects, freelancers, Project, Freelancer } from '../../../../data/mockData';

interface FreelancerWithMatch extends Freelancer {
  matchScore: number;
  matchingSkills: string[];
}

@Component({
  selector: 'app-project-details',
  standalone: false,
  templateUrl: './project-details.component.html',
  styleUrls: ['./project-details.component.scss']
})
export class ProjectDetailsComponent implements OnInit {
  project?: Project;
  showMatchModal = false;
  recommendedFreelancers: FreelancerWithMatch[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    this.project = projects.find(p => p.id === id);

    if (this.project) {
      this.calculateRecommendedFreelancers();
    }
  }

  calculateRecommendedFreelancers(): void {
    if (!this.project) return;

    const projectSkills = this.project.skills || [];
    
    this.recommendedFreelancers = freelancers
      .map((freelancer: any) => {
        const matchingSkills = freelancer.skills.filter((skill: string) =>
          projectSkills.some((pSkill: string) => pSkill.toLowerCase().includes(skill.toLowerCase()))
        );
        
        let matchScore = projectSkills.length > 0 
          ? Math.min(Math.floor((matchingSkills.length / projectSkills.length) * 100), 99)
          : 0;

        // Demo/mock data: Ensure minimum score for better UX in prototype
        if (matchScore <= 50) {
          matchScore = Math.floor(Math.random() * 30) + 70;
        }

        return {
          ...freelancer,
          matchScore,
          matchingSkills
        };
      })
      .sort((a: any, b: any) => b.matchScore - a.matchScore)
      .slice(0, 3);
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  goBackToProjects(): void {
    this.router.navigate(['/projects']);
  }

  openMatchModal(): void {
    this.showMatchModal = true;
  }

  closeMatchModal(): void {
    this.showMatchModal = false;
  }
}
