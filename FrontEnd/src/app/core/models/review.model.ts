export interface ReviewRequest {
  rating:  number;   // 1 à 5
  comment: string;
}

export interface FreelancerReplyRequest {
  reply: string;
}