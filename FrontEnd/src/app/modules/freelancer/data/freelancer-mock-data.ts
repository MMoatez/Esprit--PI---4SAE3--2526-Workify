export interface Freelancer {
  id: number;
  name: string;
  title: string;
  avatar: string;
  bio: string;
  hourlyRate: number;
  rating: number;
  reviews: number;
  skills: string[];
  location: string;
  responseTime: string;
  completedProjects: number;
  successRate: number;
  matchScore?: number;
}

export const categories = ['All Categories', 'Developer', 'Designer', 'Writer', 'Marketer'];

export const freelancers: Freelancer[] = [
  {
    id: 1,
    name: 'Sarah Chen',
    title: 'Full Stack Developer',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200',
    bio: 'Experienced developer specializing in React, Node.js, and cloud architecture.',
    hourlyRate: 85,
    rating: 4.9,
    reviews: 127,
    skills: ['React', 'Node.js', 'TypeScript', 'AWS', 'MongoDB'],
    location: 'San Francisco, CA',
    responseTime: 'Within 1 hour',
    completedProjects: 145,
    successRate: 98
  }
];
