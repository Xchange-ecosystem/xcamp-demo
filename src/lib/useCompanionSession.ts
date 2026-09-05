import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  role: string; // 'assistant' | 'user'
  content: string;
  content_type: string; // 'text' | 'component'
  component_type: string | null;
  component_payload: Record<string, unknown> | null;
  parts: unknown;
  created_at: string;
  tenant_id: string;
}

// Scope a session to a project (or `null` for the ecosystem-level chat). Passing no
// scope at all (`undefined`) preserves the old unscoped "one conversation per user"
// behavior — used by the legacy (`?ui=v1`) chat path, which manages its own
// project/conversation transitions and shouldn't be touched by this.
export interface CompanionSessionScope {
  projectId: string | null;
}

const ECOSYSTEM_SCOPE_KEY = "__ecosystem__";
const VISITED_SCOPES_KEY = "xcamp-companion-visited-scopes";

function scopeKeyOf(scope: CompanionSessionScope): string {
  return scope.projectId ?? ECOSYSTEM_SCOPE_KEY;
}

function readVisitedScopes(): Set<string> {
  if (typeof sessionStorage === "undefined") return new Set();
  try {
    const raw = sessionStorage.getItem(VISITED_SCOPES_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function markScopeVisited(scopeKey: string) {
  if (typeof sessionStorage === "undefined") return;
  const visited = readVisitedScopes();
  visited.add(scopeKey);
  sessionStorage.setItem(VISITED_SCOPES_KEY, JSON.stringify([...visited]));
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
  conversationCreatedAt: string | null;
  conversationProjectId: string | null;
  messages: ChatMessage[];
  loading: boolean;
  appendChiMessage: (text: string) => Promise<string>;
  appendUserMessage: (text: string) => Promise<void>;
  appendComponentMessage: (
    type: ComponentMessageType,
    payload?: Record<string, unknown>,
  ) => Promise<string>;
  resolveComponent: (messageId: string) => void;
  newSession: () => Promise<void>;
  closeSession: () => Promise<void>;
}

export function useCompanionSession(
  user: XcampUser | null,
  scope?: CompanionSessionScope,
): CompanionSession {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversationCreatedAt, setConversationCreatedAt] = useState<string | null>(null);
  const [conversationProjectId, setConversationProjectId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const conversationIdRef = useRef<string | null>(null);
  const scopeRef = useRef(scope);
  scopeRef.current = scope;

  useEffect(() => {
    conversationIdRef.current = conversationId;
  }, [conversationId]);

  // Load or create a conversation on mount, and again whenever the scope's project
  // changes (entering/leaving a project's Companion). A scope's first load in a given
  // browser session always starts a fresh conversation for that project (or the
  // ecosystem, for `projectId: null`); a later return to an already-visited scope in
  // the same session resumes whatever conversation is already there instead of wiping
  // it — see `VISITED_SCOPES_KEY` above.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    async function init() {
      setLoading(true);
      try {
        let convId: string;
        let convCreatedAt: string | null = null;
        let convProjectId: string | null = null;

        const scopeKey = scope ? scopeKeyOf(scope) : null;
        const forceNewFlag =
          typeof sessionStorage !== "undefined" &&
          !!sessionStorage.getItem("xcamp-force-new-session");
        const firstVisitThisSession = scopeKey !== null && !readVisitedScopes().has(scopeKey);

        if (forceNewFlag || firstVisitThisSession) {
          if (forceNewFlag && typeof sessionStorage !== "undefined")
            sessionStorage.removeItem("xcamp-force-new-session");
          convId = await createConversation(user!, scope ? scope.projectId : undefined);
          convProjectId = scope ? scope.projectId : null;
          if (scopeKey !== null) markScopeVisited(scopeKey);
        } else {
          // Find most recent active conversation, scoped to this project when a scope is given.
          // Cast through unknown early: generated types are stale and missing status column
          type ConvQuery = {
            eq: (...a: unknown[]) => ConvQuery;
            is: (...a: unknown[]) => ConvQuery;
            neq: (...a: unknown[]) => ConvQuery;
            order: (...a: unknown[]) => ConvQuery;
            limit: (...a: unknown[]) => Promise<{
              data: Array<{
                id: string;
                status: string;
                created_at: string;
                project_id: string | null;
              }> | null;
            }>;
          };
          let query = (
            supabase
              .from("jarvix_conversations")
              .select("id, status, created_at, project_id") as unknown as ConvQuery
          )
            .eq("owner_central_id", user!.centralId)
            .eq("tenant_id", user!.tenantId)
            .neq("status", "closed");
          if (scope) {
            query =
              scope.projectId === null
                ? query.is("project_id", null)
                : query.eq("project_id", scope.projectId);
          }
          const { data: convRows } = await query.order("created_at", { ascending: false }).limit(1);

          if (cancelled) return;

          if (convRows && convRows.length > 0) {
            convId = convRows[0].id;
            convCreatedAt = convRows[0].created_at;
            convProjectId = convRows[0].project_id ?? null;
          } else {
            convId = await createConversation(user!, scope ? scope.projectId : undefined);
            convProjectId = scope ? scope.projectId : null;
            if (scopeKey !== null) markScopeVisited(scopeKey);
          }
        }

        // Load messages
        const { data: msgRows } = await (supabase
          .from("jarvix_messages")
          .select(
            "id, conversation_id, role, content, content_type, component_type, component_payload, parts, created_at, tenant_id",
          )
          .eq("conversation_id", convId)
          .order("created_at", { ascending: true }) as unknown as Promise<{
          data: MessageRow[] | null;
        }>);

        if (cancelled) return;

        setConversationId(convId);
        setConversationCreatedAt(convCreatedAt);
        setConversationProjectId(convProjectId);
        setMessages((msgRows ?? []).map(rowToMessage));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void init();
    return () => {
      cancelled = true;
    };
  }, [user?.centralId, user?.tenantId, scope?.projectId]); // eslint-disable-line react-hooks/exhaustive-deps

  const appendChiMessage = useCallback(
    async (text: string): Promise<string> => {
      const id = crypto.randomUUID();
      const newMsg: ChatMessage = { id, kind: "chi", text };
      setMessages((prev) => [...prev, newMsg]);

      const convId = conversationIdRef.current;
      if (!convId || !user) return id;
      // Cast through unknown: generated types are stale and missing content_type column
      await (
        supabase.from("jarvix_messages") as unknown as {
          insert: (row: Record<string, unknown>) => Promise<unknown>;
        }
      ).insert({
        id,
        conversation_id: convId,
        role: "assistant",
        content: text,
        content_type: "text",
        tenant_id: user.tenantId,
      });
      return id;
    },
    [user],
  );

  const appendUserMessage = useCallback(
    async (text: string) => {
      const id = crypto.randomUUID();
      const newMsg: ChatMessage = { id, kind: "user", text };
      setMessages((prev) => [...prev, newMsg]);

      const convId = conversationIdRef.current;
      if (!convId || !user) return;
      await (
        supabase.from("jarvix_messages") as unknown as {
          insert: (row: Record<string, unknown>) => Promise<unknown>;
        }
      ).insert({
        id,
        conversation_id: convId,
        role: "user",
        content: text,
        content_type: "text",
        tenant_id: user.tenantId,
      });
    },
    [user],
  );

  const appendComponentMessage = useCallback(
    async (type: ComponentMessageType, payload?: Record<string, unknown>): Promise<string> => {
      const id = crypto.randomUUID();
      const newMsg: ChatMessage = { id, kind: "component", type, payload, resolved: false };
      setMessages((prev) => [...prev, newMsg]);

      const convId = conversationIdRef.current;
      if (!convId || !user) return id;
      await (
        supabase.from("jarvix_messages") as unknown as {
          insert: (row: Record<string, unknown>) => Promise<unknown>;
        }
      ).insert({
        id,
        conversation_id: convId,
        role: "assistant",
        content: "",
        content_type: "component",
        component_type: type,
        component_payload: payload ?? null,
        tenant_id: user.tenantId,
      });
      return id;
    },
    [user],
  );

  const resolveComponent = useCallback((messageId: string) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId && m.kind === "component" ? { ...m, resolved: true } : m,
      ),
    );
  }, []);

  const newSession = useCallback(async () => {
    const convId = conversationIdRef.current;
    if (convId) {
      // Cast through unknown: generated types are stale and missing status column
      await (
        supabase.from("jarvix_conversations") as unknown as {
          update: (row: Record<string, unknown>) => {
            eq: (col: string, val: string) => Promise<unknown>;
          };
        }
      )
        .update({ status: "closed" })
        .eq("id", convId);
    }
    if (!user) return;
    const currentScope = scopeRef.current;
    const nextId = await createConversation(
      user,
      currentScope ? currentScope.projectId : undefined,
    );
    setConversationId(nextId);
    setConversationCreatedAt(null);
    setConversationProjectId(currentScope ? currentScope.projectId : null);
    setMessages([]);
    if (currentScope) markScopeVisited(scopeKeyOf(currentScope));
  }, [user]);

  // Close current conversation without creating a new one (used on logout).
  // Clears local state immediately so the UI shows empty chat right away.
  // Sets a sessionStorage flag so the next init creates a fresh conversation
  // rather than finding the one we're closing (handles the race where re-login
  // happens before the DB update completes). Also clears the per-scope "already
  // visited this session" record so the next user to sign in on this browser
  // doesn't inherit it.
  const closeSession = useCallback(async () => {
    const convId = conversationIdRef.current;
    if (!convId) return;
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.setItem("xcamp-force-new-session", "1");
      sessionStorage.removeItem(VISITED_SCOPES_KEY);
    }
    conversationIdRef.current = null;
    setConversationId(null);
    setConversationCreatedAt(null);
    setConversationProjectId(null);
    setMessages([]);
    // Fire-and-forget — UI is already cleared; DB close races don't matter
    void (
      supabase.from("jarvix_conversations") as unknown as {
        update: (row: Record<string, unknown>) => {
          eq: (col: string, val: string) => Promise<unknown>;
        };
      }
    )
      .update({ status: "closed" })
      .eq("id", convId);
  }, []);

  return useMemo(
    () => ({
      conversationId,
      conversationCreatedAt,
      conversationProjectId,
      messages,
      loading,
      appendChiMessage,
      appendUserMessage,
      appendComponentMessage,
      resolveComponent,
      newSession,
      closeSession,
    }),
    [
      conversationId,
      conversationCreatedAt,
      conversationProjectId,
      messages,
      loading,
      appendChiMessage,
      appendUserMessage,
      appendComponentMessage,
      resolveComponent,
      newSession,
      closeSession,
    ],
  );
}

async function createConversation(user: XcampUser, projectId?: string | null): Promise<string> {
  const id = crypto.randomUUID();
  await (
    supabase.from("jarvix_conversations") as unknown as {
      insert: (row: Record<string, unknown>) => Promise<unknown>;
    }
  ).insert({
    id,
    owner_central_id: user.centralId,
    tenant_id: user.tenantId,
    status: "active",
    ...(projectId !== undefined ? { project_id: projectId } : {}),
  });
  return id;
}
