export type Role = 'ADMIN' | 'FREELANCER' | 'CLIENT' | 'SERVICE_DESK' | 'PARTNER';
export type AccountStatus = 'ACTIVE' | 'INACTIVE';

export interface CompetenceDto {
  id: number;
  name: string;
}

export interface UserProfile {
  id: number;
  keycloakId: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  phone: string | null;
  profilePicture: string | null;
  role: Role;
  accountStatus: AccountStatus;
  inscriptionDate: string;
  updatedAt: string;
  rib: string | null;
  title?: string;
  bio?: string;
  hourlyRate?: number;
  location?: string;
  competences: CompetenceDto[];
  educations?: EducationDto[];
  experiences?: ExperienceDto[];
  cvPdf?: string;
}

export interface EducationDto {
  id: number;
  institution: string;
  degree: string;
  description?: string;
  startDate?: string;
  endDate?: string;
}

export interface ExperienceDto {
  id: number;
  company: string;
  position: string;
  description?: string;
  startDate?: string;
  endDate?: string;
}

export interface UpdateProfileRequest {
  firstName?: string;
  lastName?: string;
  phone?: string;
  rib?: string;
}
