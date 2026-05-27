export interface Event {
  id: number;
  title: string;
  description: string;
  eventDate: string;
  location: string;
  latitude?: number;
  longitude?: number;
  capacity: number;
  category: EventCategory;
  topic: string;
  status: EventStatus;
  createdBy: string;
  createdAt: string;
  totalRegistrations: number;
  totalPartners: number;
}

export interface EventPartner {
  id: number;
  partnerId: string;
  partnerEmail: string;
  partnerName: string;
  status: PartnerStatus;
  invitedAt: string;
  respondedAt: string;
  // Renvoyé au partenaire pour répondre
  invitationToken: string;
  eventId: number;
  eventTitle: string;
  eventDate: string;
  eventLocation: string;
  eventCategory: string;
  eventDescription: string;
}

export interface AddContentRequest {
  type: ContentType;
  title: string;
  description?: string;
  resourceUrl?: string;
}

export interface EventRegistration {
  id: number;
  userId: string;
  userEmail: string;
  userName: string;
  userType: UserType;
  status: RegistrationStatus;
  registeredAt: string;
  checkedInAt?: string;
  qrToken?: string;
  eventId?: number;
  eventTitle?: string;
  eventDate?: string;
  eventLocation?: string;
}

export interface EventStats {
  eventId: number;
  eventTitle: string;
  status: EventStatus;
  totalRegistrations: number;
  totalPartners: number;
  acceptedPartners: number;
  totalContents: number;
  capacity: number;
  availableSpots: number;
}

export interface CreateEventRequest {
  title: string;
  description: string;
  eventDate: string;
  location: string;
  latitude?: number;
  longitude?: number;
  capacity: number;
  category: EventCategory;
  topic: string;
}

export interface InvitePartnerRequest {
  partnerId: string;
  partnerEmail: string;
  partnerName: string;
}

export interface PartnerSummary {
  ref: string;
  name: string;
  email: string;
  organization: string;
}

export interface RegisterEventRequest {
  userType: UserType;
}

export enum EventStatus {
  DRAFT = 'DRAFT',
  PENDING_PARTNERS = 'PENDING_PARTNERS',
  ENRICHED = 'ENRICHED',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED'
}

export enum EventCategory {
  TECHNOLOGY = 'TECHNOLOGY',
  DESIGN = 'DESIGN',
  MARKETING = 'MARKETING',
  FINANCE = 'FINANCE',
  ENTREPRENEURSHIP = 'ENTREPRENEURSHIP',
  DATA_SCIENCE = 'DATA_SCIENCE',
  CYBERSECURITY = 'CYBERSECURITY',
  WEB_DEVELOPMENT = 'WEB_DEVELOPMENT',
  MOBILE_DEVELOPMENT = 'MOBILE_DEVELOPMENT',
  OTHER = 'OTHER'
}

export enum PartnerStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  REFUSED = 'REFUSED'
}

export enum RegistrationStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  ATTENDED = 'ATTENDED',
  CANCELLED = 'CANCELLED'
}

export enum UserType {
  FREELANCER = 'FREELANCER',
  CLIENT = 'CLIENT'
}

export enum ContentType {
  WORKSHOP  = 'WORKSHOP',
  OFFER     = 'OFFER',
  FORMATION = 'FORMATION',
  DOCUMENT  = 'DOCUMENT'
}