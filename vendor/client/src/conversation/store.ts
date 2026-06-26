import { getSupabaseClient } from '../supabase/client';
import type {
  VoxConversation,
  VoxMessage,
  VoxConversationWithMessages,
  CreateConversationParams,
  CreateMessageParams,
} from '../types/conversation';

export async function createConversation(
  params: CreateConversationParams,
): Promise<VoxConversation> {
  const db = getSupabaseClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) throw new Error('createConversation: not authenticated');

  const { data: userData, error: userError } = await db
    .from('central_users')
    .select('id, tenant_id')
    .eq('id', user.id)
    .maybeSingle();
  if (userError) throw new Error(`createConversation: ${userError.message}`);
  if (!userData) throw new Error('createConversation: user not found in central_users');

  const { data, error } = await db
    .from('vox_conversations')
    .insert({
      tenant_id: userData.tenant_id,
      user_id: userData.id,
      context: params.context,
      title: params.title ?? null,
    })
    .select()
    .maybeSingle();
  if (error) throw new Error(`createConversation: ${error.message}`);
  if (!data) throw new Error('createConversation: no data returned');
  return data as VoxConversation;
}

export async function createMessage(
  params: CreateMessageParams,
): Promise<VoxMessage> {
  const db = getSupabaseClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) throw new Error('createMessage: not authenticated');

  const { data: userData, error: userError } = await db
    .from('central_users')
    .select('tenant_id')
    .eq('id', user.id)
    .maybeSingle();
  if (userError) throw new Error(`createMessage: ${userError.message}`);
  if (!userData) throw new Error('createMessage: user not found in central_users');

  const { data, error } = await db
    .from('vox_messages')
    .insert({
      conversation_id: params.conversation_id,
      tenant_id: userData.tenant_id,
      role: params.role,
      content_markdown: params.content_markdown,
      cards: params.cards ?? [],
      altitude: params.altitude,
      context: params.context,
    })
    .select()
    .maybeSingle();
  if (error) throw new Error(`createMessage: ${error.message}`);
  if (!data) throw new Error('createMessage: no data returned');

  await db
    .from('vox_conversations')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', params.conversation_id);

  return data as VoxMessage;
}

export async function getConversation(
  conversationId: string,
): Promise<VoxConversationWithMessages | null> {
  const db = getSupabaseClient();
  const { data: conv, error: convError } = await db
    .from('vox_conversations')
    .select('*')
    .eq('id', conversationId)
    .maybeSingle();
  if (convError) throw new Error(`getConversation: ${convError.message}`);
  if (!conv) return null;

  const { data: messages, error: msgError } = await db
    .from('vox_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });
  if (msgError) throw new Error(`getConversation messages: ${msgError.message}`);

  return { ...(conv as VoxConversation), messages: (messages ?? []) as VoxMessage[] };
}

export async function listConversations(
  limit = 20,
): Promise<VoxConversation[]> {
  const db = getSupabaseClient();
  const { data, error } = await db
    .from('vox_conversations')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(`listConversations: ${error.message}`);
  return (data ?? []) as VoxConversation[];
}

export async function updateConversation(
  conversationId: string,
  updates: Partial<Pick<VoxConversation, 'context' | 'title'>>,
): Promise<VoxConversation> {
  const db = getSupabaseClient();
  const { data, error } = await db
    .from('vox_conversations')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', conversationId)
    .select()
    .maybeSingle();
  if (error) throw new Error(`updateConversation: ${error.message}`);
  if (!data) throw new Error('updateConversation: no data returned');
  return data as VoxConversation;
}
