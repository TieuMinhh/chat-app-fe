// ============ User Types ============
export interface User {
  _id: string;
  username: string;
  displayName: string;
  email: string;
  avatar: string;
  status: 'online' | 'offline';
  lastSeen: string;
  createdAt: string;
}

// ============ Conversation Types ============
export interface ConversationMember {
  userId: User;
  joinedAt: string;
}

export interface LastMessage {
  content: string;
  senderId: string;
  messageType: string;
  createdAt: string;
}

export interface LinkMetadata {
  title?: string;
  description?: string;
  image?: string;
  url: string;
  siteName?: string;
}

export interface Conversation {
  _id: string;
  type: 'private' | 'group';
  name: string | null;
  avatar: string | null;
  members: ConversationMember[];
  adminId: string | null;
  lastMessage: LastMessage | null;
  pinnedMessages: (Message | string)[];
  createdAt: string;
  updatedAt: string;
}

// ============ Message Types ============
export interface Attachment {
  url: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

export interface ReadReceipt {
  userId: string;
  readAt: string;
}

export interface DeliveryReceipt {
  userId: string;
  deliveredAt: string;
}

export interface Reaction {
  userId: string;
  emoji: string;
}

export interface Message {
  _id: string;
  conversationId: string;
  senderId: User | string;
  content: string;
  messageType: 'text' | 'image' | 'file' | 'system' | 'voice' | 'sticker';
  attachments: Attachment[];
  readBy: ReadReceipt[];
  deliveredTo: DeliveryReceipt[];
  replyTo: Message | null;
  reactions: Reaction[];
  linkPreview?: LinkMetadata | null;
  isEdited: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  // Client-only fields for optimistic UI
  tempId?: string;
  status?: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
}

// ============ API Response Types ============
export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
  message: string;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

// ============ Auth Types ============
export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  username: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
}

// ============ Message List Response ============
export interface MessagesResponse {
  messages: Message[];
  hasMore: boolean;
  nextCursor: string | null;
}
