import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { freelancers, Freelancer } from '../../../data/mockData';

@Component({
  selector: 'app-freelancer-profiles',
  templateUrl: './freelancer-profiles.component.html',
  styleUrls: ['./freelancer-profiles.component.css']
})
export class FreelancerProfilesComponent implements OnInit {
  searchTerm: string = '';
  selectedCategory: string = 'All Categories';
  rateRange: [number, number] = [0, 150];
  sortBy: 'match' | 'rating' | 'rate' = 'match';
  
  categories = [
    'All Categories',
    'Full Stack Developer',
    'Frontend Developer',
    'Backend Developer',
    'UI/UX Designer',
    'Mobile Developer',
    'DevOps Engineer',
    'Data Scientist',
    'Content Writer',
    'Graphic Designer',
    'Video Editor'
  ];
  
  freelancersWithScores: (Freelancer & { matchScore: number })[] = [];
  filteredFreelancers: (Freelancer & { matchScore: number })[] = [];

  constructor(private router: Router) {}

  ngOnInit(): void {
    // Generate random match scores for demo
    this.freelancersWithScores = freelancers.map(freelancer => ({
      ...freelancer,
      matchScore: Math.floor(Math.random() * 30) + 70
    }));
    this.filterAndSortFreelancers();
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
        freelancer.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        freelancer.title.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        freelancer.skills.some(skill =>
          skill.toLowerCase().includes(this.searchTerm.toLowerCase())
        );

      const matchesCategory =
        this.selectedCategory === 'All Categories' || 
        freelancer.title === this.selectedCategory;

      const matchesRate =
        freelancer.hourlyRate >= this.rateRange[0] && 
        freelancer.hourlyRate <= this.rateRange[1];

      return matchesSearch && matchesCategory && matchesRate;
    });

    // Sort
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
    return skills.slice(0, 3);
  }

  getAdditionalSkillsCount(skills: string[]): number {
    return Math.max(0, skills.length - 3);
  }

  hireFreelancer(freelancerId: string): void {
    console.log('Hire freelancer:', freelancerId);
    // Implement hire logic
  }

  viewProfile(freelancerId: string): void {
    console.log('View profile:', freelancerId);
    // Navigate to profile page
  }
}