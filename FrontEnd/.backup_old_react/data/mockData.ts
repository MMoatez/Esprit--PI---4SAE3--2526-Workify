export interface Project {
  id: string;
  title: string;
  description: string;
  budget: {
    min: number;
    max: number;
  };
  duration: string;
  skills: string[];
  category: string;
  postedDate: string;
  client: {
    name: string;
    rating: number;
    projectsPosted: number;
  };
  proposals: number;
  matchScore?: number;
}

export interface Freelancer {
  id: string;
  name: string;
  title: string;
  avatar: string;
  rating: number;
  reviews: number;
  hourlyRate: number;
  skills: string[];
  bio: string;
  location: string;
  completedProjects: number;
  successRate: number;
  responseTime: string;
  matchScore?: number;
}

export const categories = [
  'All Categories',
  'Web Development',
  'Mobile Development',
  'UI/UX Design',
  'Graphic Design',
  'Data Science',
  'Marketing',
  'Writing',
  'Video Production',
];

export const projects: Project[] = [
  {
    id: '1',
    title: 'E-commerce Website Development',
    description: 'Looking for an experienced web developer to build a modern e-commerce platform with payment integration, product management, and responsive design.',
    budget: { min: 5000, max: 8000 },
    duration: '2-3 months',
    skills: ['React', 'Node.js', 'MongoDB', 'Stripe'],
    category: 'Web Development',
    postedDate: '2026-01-30',
    client: {
      name: 'TechStart Inc',
      rating: 4.8,
      projectsPosted: 12,
    },
    proposals: 15,
  },
  {
    id: '2',
    title: 'Mobile App UI/UX Design',
    description: 'Need a talented designer to create a modern, user-friendly interface for our fitness tracking mobile app. Should include wireframes, mockups, and prototypes.',
    budget: { min: 3000, max: 5000 },
    duration: '1-2 months',
    skills: ['Figma', 'UI Design', 'UX Research', 'Prototyping'],
    category: 'UI/UX Design',
    postedDate: '2026-01-29',
    client: {
      name: 'FitLife Solutions',
      rating: 4.9,
      projectsPosted: 8,
    },
    proposals: 23,
  },
  {
    id: '3',
    title: 'AI Chatbot Development',
    description: 'Seeking a developer with ML expertise to build an intelligent customer service chatbot using natural language processing.',
    budget: { min: 8000, max: 12000 },
    duration: '3-4 months',
    skills: ['Python', 'TensorFlow', 'NLP', 'API Integration'],
    category: 'Data Science',
    postedDate: '2026-01-28',
    client: {
      name: 'CustomerFirst Ltd',
      rating: 4.7,
      projectsPosted: 15,
    },
    proposals: 8,
  },
  {
    id: '4',
    title: 'Brand Identity & Logo Design',
    description: 'Looking for a creative designer to develop a complete brand identity including logo, color palette, typography, and brand guidelines.',
    budget: { min: 2000, max: 4000 },
    duration: '3-4 weeks',
    skills: ['Adobe Illustrator', 'Branding', 'Logo Design', 'Typography'],
    category: 'Graphic Design',
    postedDate: '2026-01-27',
    client: {
      name: 'GreenEarth Co',
      rating: 4.6,
      projectsPosted: 5,
    },
    proposals: 31,
  },
  {
    id: '5',
    title: 'iOS App Development',
    description: 'Need an experienced iOS developer to create a social networking app with real-time messaging, photo sharing, and user profiles.',
    budget: { min: 10000, max: 15000 },
    duration: '4-5 months',
    skills: ['Swift', 'SwiftUI', 'Firebase', 'Core Data'],
    category: 'Mobile Development',
    postedDate: '2026-01-26',
    client: {
      name: 'SocialBuzz',
      rating: 4.9,
      projectsPosted: 3,
    },
    proposals: 12,
  },
  {
    id: '6',
    title: 'Content Marketing Strategy',
    description: 'Looking for a marketing expert to develop and execute a comprehensive content marketing strategy including blog posts, social media, and email campaigns.',
    budget: { min: 4000, max: 6000 },
    duration: '2 months',
    skills: ['Content Strategy', 'SEO', 'Social Media', 'Copywriting'],
    category: 'Marketing',
    postedDate: '2026-01-25',
    client: {
      name: 'Digital Growth Agency',
      rating: 4.8,
      projectsPosted: 20,
    },
    proposals: 18,
  },
  {
    id: '7',
    title: 'Video Production & Editing',
    description: 'Need a skilled video editor to create promotional videos for our product launch. Must include motion graphics and professional color grading.',
    budget: { min: 3000, max: 5000 },
    duration: '1 month',
    skills: ['Adobe Premiere', 'After Effects', 'Color Grading', 'Motion Graphics'],
    category: 'Video Production',
    postedDate: '2026-01-24',
    client: {
      name: 'InnovateTech',
      rating: 4.7,
      projectsPosted: 7,
    },
    proposals: 14,
  },
  {
    id: '8',
    title: 'Technical Blog Writing',
    description: 'Looking for a technical writer to create in-depth articles about cloud computing, DevOps, and modern software architecture.',
    budget: { min: 2000, max: 3500 },
    duration: '6 weeks',
    skills: ['Technical Writing', 'Cloud Computing', 'DevOps', 'Research'],
    category: 'Writing',
    postedDate: '2026-01-23',
    client: {
      name: 'CloudMasters',
      rating: 4.9,
      projectsPosted: 10,
    },
    proposals: 9,
  },
];

export const freelancers: Freelancer[] = [
  {
    id: '1',
    name: 'Sarah Chen',
    title: 'Full Stack Developer',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400',
    rating: 4.9,
    reviews: 87,
    hourlyRate: 85,
    skills: ['React', 'Node.js', 'TypeScript', 'MongoDB', 'AWS'],
    bio: 'Experienced full-stack developer specializing in modern web applications. 7+ years building scalable solutions.',
    location: 'San Francisco, CA',
    completedProjects: 94,
    successRate: 98,
    responseTime: '2 hours',
  },
  {
    id: '2',
    name: 'Marcus Johnson',
    title: 'UI/UX Designer',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
    rating: 5.0,
    reviews: 62,
    hourlyRate: 75,
    skills: ['Figma', 'Adobe XD', 'User Research', 'Prototyping', 'Design Systems'],
    bio: 'Award-winning designer focused on creating intuitive and beautiful user experiences.',
    location: 'New York, NY',
    completedProjects: 68,
    successRate: 100,
    responseTime: '1 hour',
  },
  {
    id: '3',
    name: 'Priya Patel',
    title: 'Mobile App Developer',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400',
    rating: 4.8,
    reviews: 53,
    hourlyRate: 80,
    skills: ['React Native', 'Swift', 'Kotlin', 'Firebase', 'GraphQL'],
    bio: 'iOS and Android developer with a passion for creating smooth, performant mobile experiences.',
    location: 'Austin, TX',
    completedProjects: 56,
    successRate: 96,
    responseTime: '3 hours',
  },
  {
    id: '4',
    name: 'Alex Rodriguez',
    title: 'Data Scientist',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400',
    rating: 4.9,
    reviews: 41,
    hourlyRate: 95,
    skills: ['Python', 'TensorFlow', 'Machine Learning', 'Data Analysis', 'SQL'],
    bio: 'ML engineer specializing in NLP and computer vision. PhD in Computer Science.',
    location: 'Seattle, WA',
    completedProjects: 38,
    successRate: 97,
    responseTime: '4 hours',
  },
  {
    id: '5',
    name: 'Emily Taylor',
    title: 'Graphic Designer',
    avatar: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=400',
    rating: 4.9,
    reviews: 79,
    hourlyRate: 65,
    skills: ['Adobe Illustrator', 'Photoshop', 'Branding', 'Logo Design', 'Print Design'],
    bio: 'Creative designer with 10+ years experience in branding and visual identity design.',
    location: 'Los Angeles, CA',
    completedProjects: 102,
    successRate: 99,
    responseTime: '2 hours',
  },
  {
    id: '6',
    name: 'David Kim',
    title: 'DevOps Engineer',
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400',
    rating: 4.8,
    reviews: 34,
    hourlyRate: 90,
    skills: ['Docker', 'Kubernetes', 'AWS', 'CI/CD', 'Terraform'],
    bio: 'DevOps specialist focused on cloud infrastructure and automation.',
    location: 'Boston, MA',
    completedProjects: 45,
    successRate: 95,
    responseTime: '3 hours',
  },
  {
    id: '7',
    name: 'Lisa Anderson',
    title: 'Content Writer',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400',
    rating: 5.0,
    reviews: 96,
    hourlyRate: 55,
    skills: ['Copywriting', 'SEO', 'Content Strategy', 'Technical Writing', 'Editing'],
    bio: 'Professional writer crafting compelling content for tech companies and startups.',
    location: 'Portland, OR',
    completedProjects: 128,
    successRate: 100,
    responseTime: '1 hour',
  },
  {
    id: '8',
    name: 'James Wilson',
    title: 'Video Editor',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400',
    rating: 4.7,
    reviews: 48,
    hourlyRate: 70,
    skills: ['Adobe Premiere', 'After Effects', 'Color Grading', 'Motion Graphics', 'Sound Design'],
    bio: 'Creative video editor with expertise in commercials and promotional content.',
    location: 'Miami, FL',
    completedProjects: 67,
    successRate: 94,
    responseTime: '4 hours',
  },
];
