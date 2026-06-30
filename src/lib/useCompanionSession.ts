import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { XcampUser } from "@/types/xcamp";
import type { ChatMessage, ComponentMessageType } from "@/components/companion/ChatThread";

// Row shapes (columns confirmed via Phase 0 SQL query)
interface ConversationRow {
  id: string;
  owner_central_id: string;
  project_id: string | null;
  title: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  tenant_id: string;
}

interface MessageRow {
  id: string;
  conversation_id: string;
  role: string;          // 'assistant' | 'user'
  content: string;
  content_type: string;  // 'text' | 'component'
  component_type: string | null;
  component_payload: Record<string, unknown> | null;
  parts: unknown;
  created_at: string;
  tenant_id: string;
}

function rowToMessage(row: MessageRow): ChatMessage {
  if (row.content_type === "component") {
    return {
      id: row.id,
      kind: "component",
      type: (row.component_type ?? "backcaster-stub") as ComponentMessageType,
      payload: row.component_payload ?? undefined,
      resolved: false,
    };
  }
  if (row.role === "user") {
    return { id: row.id, kind: "user", text: row.content };
  }
  return { id: row.id, kind: "chi", text: row.content };
}

export interface CompanionSession {
  conversationId: string | null;
  messages: ChatMessage[];
  loading: boolean;
  appendChiMessage: (text: string) => Promise<void>;
  appendUserMessage: (text: string) => Promise<void>;
  appendComponentMessage: (type: ComponentMessageType, payload?: Record<string, unknown>) => Promise<string>;
  resolveComponent: (messageId: string) => void;
  newSession: () => Promise<void>;
}

export function useCompanionSession(user: XcampUser | null): CompanionSession {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const conversationIdRef = useRef<string | null>(null);

  useEffect(() => {
    conversationIdRef.current = conversationId;
  }, [conversationId]);

  // Load or create conversation on mount
  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    async function init() {
      setLoading(true);
      try {
        // Find most recent active conversation
        // Cast through unknown early: generated types are stale and missing status column
        type ConvQuery = { eq: (...a: unknown[]) => ConvQuery; neq: (...a: unknown[]) => ConvQuery; order: (...a: unknown[]) => ConvQuery; limit: (...a: unknown[]) => Promise<{ data: Array<{ id: string; status: string; created_at: string }> | null }> };
        const { data: convRows } = await (supabase
          .from("jarvix_conversations")
          .select("id, status, created_at") as unknown as ConvQuery)
          .eq("owner_central_id", user!.centralId)
          .eq("tenant_id", user!.tenantId)
          .neq("status", "closed")
          .order("created_at", { ascending: false })
          .limit(1);

        if (cancelled) return;

        let convId: string;
        if (convRows && convRows.length > 0) {
          convId = convRows[0].id;
        } else {
          convId = await createConversation(user!);
        }

        // Load messages
        const { data: msgRows } = await (supabase
          .from("jarvix_messages")
          .select("id, conversation_id, role, content, content_type, component_type, component_payload, parts, created_at, tenant_id")
          .eq("conversation_id", convId)
          .order("created_at", { ascending: true }) as unknown as Promise<{ data: MessageRow[] | null }>);

        if (cancelled) return;

        setConversationId(convId);
        setMessages((msgRows ?? []).map(rowToMessage));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void init();
    return () => { cancelled = true; };
  }, [user?.centralId, user?.tenantId]); // eslint-disable-line react-hooks/exhaustive-deps

  const appendChiMessage = useCallback(async (text: string) => {
    const id = crypto.randomUUID();
    const newMsg: ChatMessage = { id, kind: "chi", text };
    setMessages((prev) => [...prev, newMsg]);

    const convId = conversationIdRef.current;
    if (!convId || !user) return;
    // Cast through unknown: generated types are stale and missing content_type column
    await (supabase.from("jarvix_messages") as unknown as {
      insert: (row: Record<string, unknown>) => Promise<unknown>;
    }).insert({ id, conversation_id: convId, role: "assistant", content: text, content_type: "text", tenant_id: user.tenantId });
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const appendUserMessage = useCallback(async (text: string) => {
    const id = crypto.randomUUID();
    const newMsg: ChatMessage = { id, kind: "user", text };
    setMessages((prev) => [...prev, newMsg]);

    const convId = conversationIdRef.current;
    if (!convId || !user) return;
    await (supabase.from("jarvix_messages") as unknown as {
      insert: (row: Record<string, unknown>) => Promise<unknown>;
    }).insert({ id, conversation_id: convId, role: "user", content: text, content_type: "text", tenant_id: user.tenantId });
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const appendComponentMessage = useCallback(async (
    type: ComponentMessageType,
    payload?: Record<string, unknown>,
  ): Promise<string> => {
    const id = crypto.randomUUID();
    const newMsg: ChatMessage = { id, kind: "component", type, payload, resolved: false };
    setMessages((prev) => [...prev, newMsg]);

    const convId = conversationIdRef.current;
    if (!convId || !user) return id;
    await (supabase.from("jarvix_messages") as unknown as {
      insert: (row: Record<string, unknown>) => Promise<unknown>;
    }).insert({ id, conversation_id: convId, role: "assistant", content: "", content_type: "component", component_type: type, component_payload: payload ?? null, tenant_id: user.tenantId });
    return id;
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const resolveComponent = useCallback((messageId: string) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId && m.kind === "component" ? { ...m, resolved: true } : m)),
    );
  }, []);

  const newSession = useCallback(async () => {
    const convId = conversationIdRef.current;
    if (convId) {
      // Cast through unknown: generated types are stale and missing status column
      await (supabase.from("jarvix_conversations") as unknown as {
        update: (row: Record<string, unknown>) => { eq: (col: string, val: string) => Promise<unknown> };
      }).update({ status: "closed" }).eq("id", convId);
    }
    if (!user) return;
    const nextId = await createConversation(user);
    setConversationId(nextId);
    setMessages([]);
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  return { conversationId, messages, loading, appendChiMessage, appendUserMessage, appendComponentMessage, resolveComponent, newSession };
}

async function createConversation(user: XcampUser): Promise<string> {
  const id = crypto.randomUUID();
  await (supabase.from("jarvix_conversations") as unknown as {
    insert: (row: Record<string, unknown>) => Promise<unknown>;
  }).insert({ id, owner_central_id: user.centralId, tenant_id: user.tenantId, status: "active" });
  return id;
}
