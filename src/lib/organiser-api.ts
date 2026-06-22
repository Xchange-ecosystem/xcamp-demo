// Chi Organiser API client — talks directly to the live chiapi backend.
// Auth bearer token comes from the app's own Supabase session.
import { supabase } from "@/integrations/supabase/client";

const BASE_URL = "https://chiapi.xchange.eco";

export type ProposalType = "new_objective" | "link_to_objective" | (string & {});

export interface OrganiserProposal {
  proposal_id: string;
  proposal_type: ProposalType;
  payload: { title?: string; [k: string]: unknown };
}

export interface ProposeResponse {
  session_id: string;
  proposals: OrganiserProposal[];
}

export interface CommitFailure {
  proposal_id?: string;
  title?: string;
  error?: string;
}

export interface CommitResult {
  succeeded: number;
  failures: CommitFailure[];
}

export class OrganiserError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "OrganiserError";
    this.status = status;
  }
}

async function authHeaders(): Promise<HeadersInit> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new OrganiserError("You need to be signed in.", 401);
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

function extractErrorMessage(rawText: string, status: number): string {
  const fallback = `Request failed (${status}).`;
  if (!rawText) return fallback;
  try {
    const body = JSON.parse(rawText) as Record<string, unknown>;
    const msg =
      (typeof body.detail === "string" && body.detail) ||
      (typeof body.message === "string" && body.message) ||
      (typeof body.error === "string" && body.error) ||
      (body.error && typeof body.error === "object"
        ? (body.error as { message?: string }).message
        : undefined);
    return msg || rawText.slice(0, 300) || fallback;
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
    throw new OrganiserError("Network error reaching Chi. Please try again.", 0);
  }
  if (!res.ok) {
    const rawText = await res.text().catch(() => "");
    console.error(`[organiser] ${path} ${res.status}`, rawText);
    throw new OrganiserError(extractErrorMessage(rawText, res.status), res.status);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export async function propose(args: {
  userId: string;
  tenantId: string;
  intent: string;
}): Promise<ProposeResponse> {
  const res = await request<Record<string, unknown>>("/api/organiser/propose", {
    method: "POST",
    body: JSON.stringify({
      user_id: args.userId,
      tenant_id: args.tenantId,
      goal: args.intent,
      context: {},
    }),
  });
  const root = (res?.data && typeof res.data === "object" ? res.data : res) as Record<string, unknown>;
  const proposals = Array.isArray(root.proposals) ? (root.proposals as OrganiserProposal[]) : [];
  const session_id = String(root.session_id ?? "");
  return { session_id, proposals };
}

export async function confirm(
  sessionId: string,
  approvals: { proposal_id: string; approved: boolean }[],
): Promise<void> {
  await request("/api/organiser/confirm", {
    method: "POST",
    body: JSON.stringify({ session_id: sessionId, approvals }),
  });
}

export async function commit(sessionId: string): Promise<CommitResult> {
  const res = await request<Record<string, unknown>>("/api/organiser/commit", {
    method: "POST",
    body: JSON.stringify({ session_id: sessionId }),
  });
  const root = (res?.data && typeof res.data === "object" ? res.data : res) as Record<string, unknown>;
  const rawFailures =
    (Array.isArray(root.failures) && root.failures) ||
    (Array.isArray(root.errors) && root.errors) ||
    [];
  const failures: CommitFailure[] = (rawFailures as unknown[]).map((f) => {
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
      : Array.isArray(root.committed)
        ? (root.committed as unknown[]).length
        : 0;
  return { succeeded, failures };
}

export function noteToIntent(title: string, bodyHtml: string | null): string {
  const body = (bodyHtml ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return [title.trim(), body].filter(Boolean).join("\n\n");
}
