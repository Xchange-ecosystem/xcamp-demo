import type { AICard, Altitude } from "./ai";
import type { CompanionContext } from "./context";

export interface VoxConversation {
  id: string;
  tenant_id: string;
  user_id: string;
  context: CompanionContext;
  title?: string;
  created_at: string;
  updated_at: string;
}

export interface VoxMessage {
  id: string;
  conversation_id: string;
  tenant_id: string;
  role: "user" | "vox";
  content_markdown: string;
  cards: AICard[];
  altitude: Altitude;
  context: CompanionContext;
  created_at: string;
}

export interface VoxConversationWithMessages extends VoxConversation {
  messages: VoxMessage[];
}

export interface CreateConversationParams {
  context: CompanionContext;
  title?: string;
}

export interface CreateMessageParams {
  conversation_id: string;
  role: "user" | "vox";
  content_markdown: string;
  cards?: AICard[];
  altitude: Altitude;
  context: CompanionContext;
}
