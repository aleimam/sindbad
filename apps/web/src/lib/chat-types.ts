export type Receipt = 'SENT' | 'DELIVERED' | 'READ';

export interface ChatMessage {
  id: string;
  senderAccountId: string;
  body: string | null;
  replyTo: { id: string; body: string | null; senderAccountId: string; unsentAt: string | null } | null;
  editedAt: string | null;
  unsent: boolean;
  receipt: Receipt;
  createdAt: string;
  photos?: string[];
}

export interface ChatThreadSummary {
  id: string;
  lastMessageAt: string;
  other: { id: string; displayName: string; credibilityScore?: number; credibilityTier?: string };
  lastMessage: ChatMessage | null;
  unread: number;
}
