// Chi Organiser API client — talks to xcamp-backend.
// Auth bearer token comes from the app's own Supabase session.
import { supabase } from "@/lib/supabase";
import type { AICard } from "@xchange/client";

// VITE_BACKEND_API_URL should be the bare origin with no path suffix
// e.g. https://xcampapi.xchange.eco (paths below already include /api/)
const BASE_URL = ((import.meta.env.VITE_BACKEND_API_URL as string | undefined) ?? '').replace(/\/$/, '');

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

export interface CommitResultItem {
  proposal_id: string;
  proposal_type: string;
  id: string;
  project_id?: string;    // populated for new_objective
  objective_id?: string;  // populated for link_to_objective
}

export interface CommitResult {
  succeeded: number;
  failures: CommitFailure[];
  suggested_task_cards?: AICard[];
  results?: CommitResultItem[];
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
  projectId?: string;
  goal?: string;
  /** @deprecated use goal */
  intent?: string;
}): Promise<ProposeResponse> {
  const res = await request<Record<string, unknown>>("/api/organiser/propose", {
    method: "POST",
    body: JSON.stringify({
      user_id: args.userId,
      tenant_id: args.tenantId,
      project_id: args.projectId,
      goal: args.goal ?? args.intent,
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
  const suggested_task_cards = Array.isArray(root.suggested_task_cards)
    ? (root.suggested_task_cards as AICard[])
    : undefined;
  const results = Array.isArray(root.results)
    ? (root.results as unknown[]).map((r) => {
        const o = (r ?? {}) as Record<string, unknown>;
        return {
          proposal_id: String(o.proposal_id ?? ''),
          proposal_type: String(o.proposal_type ?? ''),
          id: String(o.id ?? ''),
          project_id: typeof o.project_id === 'string' ? o.project_id : undefined,
          objective_id: typeof o.objective_id === 'string' ? o.objective_id : undefined,
        } as CommitResultItem;
      })
    : undefined;
  return { succeeded, failures, suggested_task_cards, results };
}

export function noteToGoal(title: string, bodyHtml: string | null): string {
  const body = (bodyHtml ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return [title.trim(), body].filter(Boolean).join("\n\n");
}

/** @deprecated use noteToGoal */
export const noteToIntent = noteToGoal;
