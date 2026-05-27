export interface Project {
  id: string;
  title: string;
  description: string;
  skills: string[];
  budget: {
    min: number;
    max: number;
  };
  duration: string;
  proposals: number;
  category: string;
  postedDate: string;
  client: {
    name: string;
    rating: number;
    projectsPosted: number;
  };
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
  'Video Production'
];

export const projects: Project[] = [
  {
    id: '1',
    title: 'E-commerce Website Development',
    description: 'Looking for an experienced web developer to build a modern e-commerce platform with payment integration, product management, and responsive design.',
    skills: ['React', 'Node.js', 'MongoDB', 'Stripe'],
    budget: { min: 5000, max: 8000 },
    duration: '2-3 months',
    proposals: 15,
    category: 'Web Development',
    postedDate: '2026-01-30',
    client: {
      name: 'TechStart Inc',
      rating: 4.8,
      projectsPosted: 12
    }
  },
  {
    id: '2',
    title: 'Mobile App UI/UX Design',
    description: 'Need a creative designer to create a modern, user-friendly interface for our fitness tracking mobile application.',
    skills: ['Figma', 'UI Design', 'UX Research', 'Prototyping'],
    budget: { min: 3000, max: 5000 },
    duration: '1-2 months',
    proposals: 8,
    category: 'UI/UX Design',
    postedDate: '2026-02-05',
    client: {
      name: 'FitLife Corp',
      rating: 4.9,
      projectsPosted: 6
    }
  },
  {
    id: '3',
    title: 'Data Analytics Dashboard',
    description: 'Build an interactive dashboard for visualizing sales data with real-time updates and custom reporting features.',
    skills: ['Python', 'Django', 'D3.js', 'PostgreSQL'],
    budget: { min: 4000, max: 7000 },
    duration: '2 months',
    proposals: 12,
    category: 'Data Science',
    postedDate: '2026-02-03',
    client: {
      name: 'DataFlow Solutions',
      rating: 4.7,
      projectsPosted: 8
    }
  },
  {
    id: '4',
    title: 'Social Media Marketing Campaign',
    description: 'Create and manage a comprehensive social media marketing strategy across multiple platforms to increase brand awareness.',
    skills: ['Social Media', 'Content Strategy', 'Analytics', 'Copywriting'],
    budget: { min: 2000, max: 4000 },
    duration: '3 months',
    proposals: 20,
    category: 'Marketing',
    postedDate: '2026-02-01',
    client: {
      name: 'BrandBoost Agency',
      rating: 4.6,
      projectsPosted: 15
    }
  },
  {
    id: '5',
    title: 'iOS Mobile Game Development',
    description: 'Develop an engaging puzzle game for iOS with smooth animations, in-app purchases, and Game Center integration.',
    skills: ['Swift', 'SpriteKit', 'Game Design', 'iOS'],
    budget: { min: 8000, max: 12000 },
    duration: '4-5 months',
    proposals: 6,
    category: 'Mobile Development',
    postedDate: '2026-01-28',
    client: {
      name: 'GameStudio Pro',
      rating: 4.9,
      projectsPosted: 4
    }
  },
  {
    id: '6',
    title: 'Corporate Video Production',
    description: 'Produce a professional 2-minute company introduction video with animation, voiceover, and background music.',
    skills: ['Video Editing', 'After Effects', 'Motion Graphics', 'Storyboarding'],
    budget: { min: 3500, max: 6000 },
    duration: '1 month',
    proposals: 10,
    category: 'Video Production',
    postedDate: '2026-02-06',
    client: {
      name: 'Corporate Media Inc',
      rating: 4.8,
      projectsPosted: 10
    }
  },
  {
    id: '7',
    title: 'Technical Blog Writing',
    description: 'Write 10 in-depth technical articles about cloud computing, DevOps, and modern software architecture.',
    skills: ['Technical Writing', 'Cloud Computing', 'DevOps', 'SEO'],
    budget: { min: 1500, max: 2500 },
    duration: '1 month',
    proposals: 18,
    category: 'Writing',
    postedDate: '2026-02-04',
    client: {
      name: 'Tech Blog Network',
      rating: 4.7,
      projectsPosted: 22
    }
  },
  {
    id: '8',
    title: 'Brand Identity Design',
    description: 'Create a complete brand identity package including logo, color palette, typography, and brand guidelines.',
    skills: ['Branding', 'Logo Design', 'Adobe Illustrator', 'Typography'],
    budget: { min: 2500, max: 4500 },
    duration: '3-4 weeks',
    proposals: 14,
    category: 'Graphic Design',
    postedDate: '2026-02-02',
    client: {
      name: 'StartUp Ventures',
      rating: 4.9,
      projectsPosted: 3
    }
  }
];


export interface Freelancer {
  id: string;
  name: string;
  title: string;
  avatar?: string;
  rating: number;
  reviewCount: number;
  hourlyRate: number;
  projectsCompleted: number;
  skills: string[];
  location: string;
  matchScore?: number;
}

export const freelancers: Freelancer[] = [
  {
    id: '1',
    name: 'David Kim',
    title: 'Full Stack Developer',
    rating: 4.9,
    reviewCount: 87,
    hourlyRate: 85,
    projectsCompleted: 156,
    skills: ['React', 'Node.js', 'MongoDB', 'TypeScript'],
    location: 'San Francisco, CA'
  },
  {
    id: '2',
    name: 'Sarah Johnson',
    title: 'UI/UX Designer',
    rating: 5.0,
    reviewCount: 64,
    hourlyRate: 75,
    projectsCompleted: 98,
    skills: ['Figma', 'UI Design', 'UX Research', 'Prototyping'],
    location: 'New York, NY'
  },
  {
    id: '3',
    name: 'Michael Chen',
    title: 'Mobile Developer',
    rating: 4.8,
    reviewCount: 92,
    hourlyRate: 90,
    projectsCompleted: 134,
    skills: ['React Native', 'iOS', 'Android', 'Swift'],
    location: 'Seattle, WA'
  },
  {
    id: '4',
    name: 'Emily Taylor',
    title: 'Graphic Designer',
    rating: 4.9,
    reviewCount: 79,
    hourlyRate: 65,
    projectsCompleted: 102,
    skills: ['Photoshop', 'Illustrator', 'Branding', 'Print Design'],
    location: 'Austin, TX'
  },
  {
    id: '5',
    name: 'Lisa Anderson',
    title: 'Content Writer',
    rating: 5.0,
    reviewCount: 96,
    hourlyRate: 55,
    projectsCompleted: 128,
    skills: ['Technical Writing', 'SEO', 'Copywriting', 'Content Strategy'],
    location: 'Boston, MA'
  }
];