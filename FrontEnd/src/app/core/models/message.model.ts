/**
 * Modèle pour les messages de la plateforme
 * Utilisé pour la communication entre clients et freelancers
 */

export interface Message {
  id: number;
  conversationId: number;
  senderId: number;
  content: string;
  contentType: MessageContentType;
  reactionEmoji?: string;
  deliveryStatus: DeliveryStatus;
  isFlagged: boolean;
  flaggedReason?: string;
  createdAt: Date;
  isDeleted: boolean;
  isEdited?: boolean;

  // Relations - populated from backend
  sender?: User;
}

export enum MessageContentType {
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
  FILE = 'FILE',
  RECORD = 'RECORD'
}

export enum DeliveryStatus {
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  READ = 'READ',
  BLOCKED = 'BLOCKED'
}

// User interface (peut être importée depuis user-profile.model.ts si elle existe déjà)
export interface User {
  id: number;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  profilePicture?: string;
  role?: string;
}

// DTOs pour les requêtes
export interface SendMessageRequest {
  conversationId: number;
  content: string;
  contentType: MessageContentType;
}

export interface UpdateMessageRequest {
  content?: string;
  reactionEmoji?: string;
}

export interface MessageSearchRequest {
  conversationId: number;
  keyword?: string;
  contentType?: MessageContentType;
  startDate?: Date;
  endDate?: Date;
}

export interface MessageResponse {
  message: Message;
  success: boolean;
  error?: string;
}
