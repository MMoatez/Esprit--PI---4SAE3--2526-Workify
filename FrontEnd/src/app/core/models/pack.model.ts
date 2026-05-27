export interface Pack {
  id?: number;
  name: string;
  description: string;
  price?: number;
  duration?: Duration;
  userType: UserType;
  features: Feature[];
  /** Per-duration pricing options (multi-duration packs). */
  options?: PackOption[];
  createdAt?: string;
  updatedAt?: string;
}

export interface PackOption {
  id?: number;
  duration: Duration;
  price: number;
  active: boolean;
}

export interface Feature {
  id?: number;
  text: string;
  packId?: number;
}

export enum Duration {
  ONE_MONTH = 'ONE_MONTH',
  THREE_MONTHS = 'THREE_MONTHS',
  SIX_MONTHS = 'SIX_MONTHS',
  ONE_YEAR = 'ONE_YEAR'
}

export enum UserType {
  FREELANCER = 'FREELANCER',
  CLIENT = 'CLIENT',
  FREELANCER_CLIENT = 'FREELANCER_CLIENT',
  PARTNER = 'PARTNER'
}

// Helpers pour affichage
export const DurationDisplay = {
  ONE_MONTH: '1 month',
  THREE_MONTHS: '3 months',
  SIX_MONTHS: '6 months',
  ONE_YEAR: '1 year'
};