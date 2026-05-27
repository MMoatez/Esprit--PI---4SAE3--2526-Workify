export interface ResponseFeedbackDto {
  id: number;
  feedbackId: number;
  freelancerId: number;
  content: string;
  deleted: boolean;
  fraudScore?: number;
  aiSentiment?: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' | 'APOLOGETIC' | 'CONSTRUCTIVE';
  aiSentimentScore?: number;
  aiTone?: string;
  aiThemes?: string;
  attachments?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface FeedbackDto {
  id: number;
  offerId: number;
  clientEmail: string;
  freelancerId: number;
  projectTitle?: string;
  ratingGlobal: number;
  ratingCommunication: number;
  ratingQuality: number;
  ratingDeadline: number;
  ratingProfessionalism: number;
  comment: string;
  recommend: boolean;
  locked: boolean;
  deleted: boolean;
  fraudScore?: number;
  fraudFlags?: string;
  aiSentiment?: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' | 'APOLOGETIC' | 'CONSTRUCTIVE';
  aiSentimentScore?: number;
  aiTone?: string;
  aiThemes?: string;
  attachments?: string[];
  sourceLang?: string;
  response?: ResponseFeedbackDto;
  createdAt: string;
  updatedAt: string;
}

export interface FeedbackRequest {
  ratingGlobal: number;
  ratingCommunication: number;
  ratingQuality: number;
  ratingDeadline: number;
  ratingProfessionalism: number;
  comment: string;
  recommend: boolean;
  clientEmail: string;
  attachments?: string[];
}

export interface FeedbackUpdateRequest {
  ratingGlobal: number;
  ratingCommunication: number;
  ratingQuality: number;
  ratingDeadline: number;
  ratingProfessionalism: number;
  comment: string;
  recommend: boolean;
  attachments?: string[];
}

export interface ResponseFeedbackRequest {
  content: string;
  freelancerId: number;
  attachments?: string[];
}

export interface FreelancerSummaryDto {
  freelancerId: number;
  avgGlobal: number;
  avgCommunication: number;
  avgQuality: number;
  avgDeadline: number;
  avgProfessionalism: number;
  totalFeedbacks: number;
  totalRecommendations: number;
  recommendationRate: number;
  feedbacks: FeedbackDto[];
}

export interface EvaluationStatusDto {
  offerId: number;
  evaluationPending: boolean;
  evaluationDeadline?: string;
  secondsRemaining: number;
  hasFeedback: boolean;
  projectTitle?: string;
}
