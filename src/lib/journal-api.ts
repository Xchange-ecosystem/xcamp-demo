// Journal → Notes flow API client. Talks to the live chiapi backend and reads
// the Supabase session for auth + tenant context.
import { supabase } from "@/integrations/supabase/client";

const BASE_URL = "https://chiapi.xchange.eco";

export type SuggestedNoteType = "note" | "task" | "resource" | (string & {});

export interface JournalProposal {
  proposal_id?: string;
  proposal_type: string;
  payload: {
    title?: string;
    project_id?: string;
    project_title?: string;
    objective_title?: string;
    [k: string]: unknown;
  };
}

export interface JournalTopic {
  id: string;
  title: string;
  summary: string;
  suggested_note_type: SuggestedNoteType;
  organiser_session_id: string;
  organiser_proposals: JournalProposal[];
}

export interface AnswerWithContextResult {
  answer: string;
}

export class JournalError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "JournalError";
    this.status = status;
  }
}

async function authHeaders(): Promise<HeadersInit> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new JournalError("You need to be signed in.", 401);
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

function extractErrorMessage(rawText: string, status: number): string {
  const fallback = `Request failed (${status}).`;
  if (!rawText) return fallback;
  try {
    const body = JSON.parse(rawText) as Record<string, unknown>;
    const msg =
      (typeof body.detail === "string" && body.detail) ||
      (typeof body.message === "string" && body.message) ||
      (typeof body.error === "string" && body.error);
    return (msg as string) || rawText.slice(0, 300) || fallback;
  } catch {
    return rawText.slice(0, 300) || fallback;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = await authHeaders();
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: { ...headers, ...(init?.headers ?? {}) },
    });
  } catch {
    throw new JournalError("Network error reaching the journal service. Please try again.", 0);
  }
  if (!res.ok) {
    const rawText = await res.text().catch(() => "");
    console.error(`[journal] ${path} ${res.status}`, rawText);
    throw new JournalError(extractErrorMessage(rawText, res.status), res.status);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

function asArray(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

function mapProposal(raw: unknown): JournalProposal {
  const o = (raw ?? {}) as Record<string, unknown>;
  const payload =
    o.payload && typeof o.payload === "object" ? (o.payload as JournalProposal["payload"]) : {};
  return {
    proposal_id: typeof o.proposal_id === "string" ? o.proposal_id : undefined,
    proposal_type: String(o.proposal_type ?? o.type ?? "proposal"),
    payload,
  };
}

export async function analyse(args: {
  text: string;
  userId: string;
  tenantId: string;
}): Promise<JournalTopic[]> {
  const res = await request<Record<string, unknown>>("/journal/analyse", {
    method: "POST",
    body: JSON.stringify({
      text: args.text,
      user_id: args.userId,
      tenant_id: args.tenantId,
    }),
  });
  const root = (res?.data && typeof res.data === "object" ? res.data : res) as Record<string, unknown>;
  const topics = asArray(root.topics);
  return topics.map((raw, i) => {
    const o = (raw ?? {}) as Record<string, unknown>;
    const proposals = asArray(o.organiser_proposals).map(mapProposal);
    return {
      id: String(o.id ?? o.topic_id ?? `topic-${i}`),
      title: String(o.title ?? "Untitled topic"),
      summary: String(o.summary ?? o.body ?? ""),
      suggested_note_type: String(o.suggested_note_type ?? "note") as SuggestedNoteType,
      organiser_session_id: String(o.organiser_session_id ?? o.session_id ?? ""),
      organiser_proposals: proposals,
    };
  });
}

export async function answerWithContext(args: {
  question: string;
  tenantId: string;
  projectId?: string;
  topK?: number;
}): Promise<AnswerWithContextResult> {
  const res = await request<Record<string, unknown>>("/answer-with-context", {
    method: "POST",
    body: JSON.stringify({
      question: args.question,
      top_k: args.topK ?? 5,
      project_id: args.projectId,
      tenant_id: args.tenantId,
      context_scope: "project",
    }),
  });
  const root = (res?.data && typeof res.data === "object" ? res.data : res) as Record<string, unknown>;
  const answer =
    (typeof root.answer === "string" && root.answer) ||
    (typeof root.text === "string" && root.text) ||
    (typeof root.response === "string" && root.response) ||
    "";
  return { answer: answer as string };
}

export interface CommitResult {
  succeeded: number;
  failures: { proposal_id?: string; title?: string; error?: string }[];
}

export async function confirmSession(
  sessionId: string,
  approvals: { proposal_id: string; approved: boolean }[],
): Promise<void> {
  await request("/organiser/confirm", {
    method: "POST",
    body: JSON.stringify({ session_id: sessionId, approvals }),
  });
}

export async function commitSession(sessionId: string): Promise<CommitResult> {
  const res = await request<Record<string, unknown>>("/organiser/commit", {
    method: "POST",
    body: JSON.stringify({ session_id: sessionId }),
  });
  const root = (res?.data && typeof res.data === "object" ? res.data : res) as Record<string, unknown>;
  const rawFailures = (asArray(root.failures).length ? root.failures : root.errors) as unknown;
  const failures = asArray(rawFailures).map((f) => {
    const o = (f ?? {}) as Record<string, unknown>;
    return {
      proposal_id: typeof o.proposal_id === "string" ? o.proposal_id : undefined,
      title: typeof o.title === "string" ? o.title : undefined,
      error: typeof o.error === "string" ? o.error : undefined,
    };
  });
  const succeeded =
    typeof root.succeeded === "number"
      ? root.succeeded
      : asArray(root.committed).length;
  return { succeeded, failures };
}

// ---- History (direct Supabase) ----

export type SessionStatus = "pending" | "committed" | "partial" | (string & {});

export interface JournalSession {
  id: string;
  created_at: string;
  status: SessionStatus;
  proposalCount: number;
  context: Record<string, unknown>;
}

export interface SessionDetail {
  noteTitles: string[];
}

export async function listJournalSessions(userId: string): Promise<JournalSession[]> {
  const { data, error } = await supabase
    .from("organiser_sessions")
    .select("*")
    .eq("user_id", userId)
    .eq("context->>source", "journal")
    .order("created_at", { ascending: false });
  if (error) throw error;
  const sessions = (data ?? []) as Record<string, unknown>[];
  if (sessions.length === 0) return [];

  const ids = sessions.map((s) => s.id as string);
  const { data: props } = await supabase
    .from("organiser_proposals")
    .select("session_id")
    .in("session_id", ids);
  const counts = new Map<string, number>();
  for (const p of (props ?? []) as Record<string, unknown>[]) {
    const sid = p.session_id as string;
    counts.set(sid, (counts.get(sid) ?? 0) + 1);
  }

  return sessions.map((s) => ({
    id: s.id as string,
    created_at: (s.created_at as string) ?? new Date().toISOString(),
    status: (s.status as SessionStatus) ?? "pending",
    proposalCount: counts.get(s.id as string) ?? 0,
    context:
      s.context && typeof s.context === "object" ? (s.context as Record<string, unknown>) : {},
  }));
}

export async function getSessionNoteTitles(sessionId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("organiser_proposals")
    .select("payload, status")
    .eq("session_id", sessionId);
  if (error) throw error;
  const rows = (data ?? []) as Record<string, unknown>[];
  return rows
    .map((r) => {
      const payload =
        r.payload && typeof r.payload === "object" ? (r.payload as Record<string, unknown>) : {};
      return typeof payload.title === "string" ? payload.title : null;
    })
    .filter((t): t is string => !!t);
}

export function placementLabel(p: JournalProposal): string {
  const title = p.payload.title || p.payload.objective_title || p.payload.project_title || "";
  const kind = p.proposal_type
    .replace(/_/g, " ")
    .replace("link to ", "")
    .replace("new ", "");
  const pretty = kind.charAt(0).toUpperCase() + kind.slice(1);
  return title ? `→ ${pretty}: ${title}` : `→ ${pretty}`;
}
