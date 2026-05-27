export interface MyOffer {
  id?: number;

  price: number | null;
  duration: number | null;
  message: string;

  createdAt?: string;
  status?: OfferStatus;

  freelancer?: {
    id: number;
    userId?: number | null;
    nom: string;
    email?: string | null;
    bio?: string | null;
    localisation?: string | null;
    disponibilite?: boolean;
    noteMoyenne?: number | null;
  };

  project?: {
    id: number;
    title?: string;
    shortDescription?: string;
    category?: string;
  };

  // ⭐ Champs review
  rating?:              number;
  reviewComment?:       string;
  reviewedAt?:          string;
  freelancerReply?:     string;
  freelancerRepliedAt?: string;
}

export enum OfferStatus {
  PENDING   = 'PENDING',
  ACCEPTED  = 'ACCEPTED',
  REJECTED  = 'REJECTED',
  COMPLETED = 'COMPLETED',
}