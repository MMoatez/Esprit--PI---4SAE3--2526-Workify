// src/app/core/models/conversation.model.ts

// ===========================
// ENUMS
// ===========================

export enum ConversationStatus {
  ACTIVE = 'ACTIVE',
  BLOCKED = 'BLOCKED'
}

export enum PriorityLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH'
}

export enum MessageContentType {
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
  FILE = 'FILE',
  VIDEO = 'VIDEO',
  RECORD = 'RECORD',
  CALL = 'CALL'
}
export enum MessageContentTypeRecord {
  RECORD = 'RECORD'
}

export enum DeliveryStatus {
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  READ = 'READ',
  BLOCKED = 'BLOCKED'
}

// ===========================
// USER INTERFACE
// ===========================

export interface User {
  id: number;
  firstName?: string;
  lastName?: string;
  email?: string;
  username?: string;
  profilePicture?: string;
  role?: string;
}

// ===========================
// CONVERSATION INTERFACE
// ===========================

export interface Conversation {
  id: number;
  creatorId: number;
  receiverId: number;
  title: string;
  themeColor?: string;
  emojiIcon?: string;
  isFavorite: boolean;
  isArchived: boolean;
  archivedAt?: Date;
  priorityLevel: string;  // 'LOW' | 'MEDIUM' | 'HIGH'
  lastMessageAt?: Date;
  status: string;  // 'ACTIVE' | 'BLOCKED'
  createdAt: Date;
  blockedById?: number;
  blockedByMe?: boolean;  // backend sets this: true = current user is the blocker

  // Données enrichies du backend
  lastMessageContent?: string;
  lastMessageSenderId?: number;
  unreadCount?: number;

  // Infos de l'autre participant (depuis le backend)
  otherUserId?: number;
  otherUserFirstName?: string;
  otherUserLastName?: string;
  otherUserUsername?: string;
  otherUserEmail?: string;
  otherUserProfilePicture?: string;

  // DEPRECATED - Gardé pour compatibilité temporaire
  receiver?: User;
  creator?: User;
  lastMessage?: Message;
}

// ===========================
// MESSAGE INTERFACE
// ===========================

export interface Message {
  id: number;
  conversationId: number;
  senderId: number;
  content: string;
  contentType: MessageContentType;
  reactionEmoji?: string;
  deliveryStatus: DeliveryStatus;
  isFlagged?: boolean;
  flaggedReason?: string;
  createdAt: Date;
  isDeleted?: boolean;
  isEdited?: boolean;

  // Moderation response fields (present only on flagged send responses)
  violationCount?: number;
  bannedUntil?: string;

  // Relations
  sender?: User;

  // Client-side only (pour pin local)
  isPinned?: boolean;
}

// ===========================
// DTOs
// ===========================

export interface CreateConversationDTO {
  receiverId: number;
  title: string;
  themeColor?: string;
  emojiIcon?: string;
}

export interface UpdateConversationDTO {
  title?: string;
  themeColor?: string;
  emojiIcon?: string;
  isFavorite?: boolean;
  isArchived?: boolean;
  status?: ConversationStatus;
  blockedById?: number;
}

export interface SendMessageRequest {
  conversationId: number;
  content: string;
  contentType: MessageContentType;
  senderRole?: string;   // FREELANCER | CLIENT | ADMIN — used for RAG indexing
  senderEmail?: string;  // extracted from JWT — used for moderation emails (avoids user-service call)
}

export interface UpdateMessageDTO {
  content?: string;
  reactionEmoji?: string;
  deliveryStatus?: DeliveryStatus;
  isDeleted?: boolean;
}

// ===========================
// PAGINATION
// ===========================

export interface PageableResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}
