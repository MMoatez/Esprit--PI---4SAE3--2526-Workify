export enum MeetingStatus {
  PROPOSED = 'PROPOSED',
  CONFIRMED = 'CONFIRMED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  REJECTED = 'REJECTED'
}

export interface MeetingProposal {
  id?: number;
  meetingId: number;
  proposedDate: string;
  proposedByUserId: number;
  voteCount?: number;
  votedByUserIds?: number[];
}

export interface Meeting {
  id?: number;
  projetId: number;
  title: string;
  description?: string;
  meetingDate?: string;
  durationMinutes: number;
  status: MeetingStatus;
  isOnline?: boolean;
  meetingLink?: string;
  meetingNotes?: string;
  cancellationReason?: string;
  rejectionReason?: string;
  completedByUserId?: number;
  rejectedByUserId?: number;
  cancelledByUserId?: number;
  createdByUserId: number;
  createdAt?: string;
  proposals: MeetingProposal[];
  participantIds?: number[];
}

export interface CreateMeetingDto {
  projetId: number;
  title: string;
  description: string;
  durationMinutes: number;
  createdBy: number;
  proposedDates: string[];
  participantIds: number[];
  isOnline: boolean;
  meetingLink: string;
}

export interface VoteProposalDto {
  proposalId: number;
  userId: number;
}
