// Backcaster Quick Road API client — talks directly to the live xcampapi backend.
// Auth bearer token comes from the app's own Supabase session.
import { supabase } from "@/integrations/supabase/client";

const BASE_URL = "https://xcampapi.xchange.eco/api/v1/backcaster";

export interface BackcasterMode {
  id: string;
  name: string;
  description: string;
  allowed_depth_min: number;
  allowed_depth_max: number;
  default_depth: number;
  status: string;
  slug?: string;
  category?: string;
  road?: string;
}

export type OutputNodeType = "project" | "objective" | "note" | "task";

export interface OutputNode {
  id: string;
  node_type: OutputNodeType;
  title: string;
  description: string;
  children: OutputNode[];
  success_criteria?: string[];
  risks?: string[];
}

export interface OutputTree {
  title: string;
  summary: string;
  mode: string;
  parameters: Record<string, unknown>;
  root_nodes: OutputNode[];
}

export interface BackcasterSession {
  id: string;
  status: "input" | "interpreted" | "generating" | "completed";
  materialized_init_id?: string | null;
  [key: string]: unknown;
}

export class BackcasterError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "BackcasterError";
    this.status = status;
  }
}

async function authHeaders(): Promise<HeadersInit> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new BackcasterError("You need to be signed in.", 401);
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = await authHeaders();
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: { ...headers, ...(init?.headers ?? {}) },
  });

  if (!res.ok) {
    let message = `Request failed (${res.status}).`;
    try {
      const body = await res.json();
      if (body?.message) message = body.message;
      else if (body?.error) message = body.error;
    } catch {
      // ignore parse errors
    }
    throw new BackcasterError(message, res.status);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export async function listModes(): Promise<BackcasterMode[]> {
  const res = await request<unknown>("/modes", { method: "GET" });
  if (Array.isArray(res)) return res as BackcasterMode[];
  const wrapper = res as { data?: unknown; modes?: unknown; results?: unknown };
  const arr = wrapper.data ?? wrapper.modes ?? wrapper.results ?? [];
  return Array.isArray(arr) ? (arr as BackcasterMode[]) : [];
}

// Some endpoints wrap the payload as { success, data }. Unwrap consistently.
function unwrap<T>(res: unknown): T {
  const root = (res ?? {}) as { data?: unknown };
  if (root && typeof root === "object" && "data" in root && root.data && typeof root.data === "object") {
    return root.data as T;
  }
  return res as T;
}

export async function createSession(body: {
  mode_id: string;
  raw_input?: string;
  ai_character_id?: string;
}): Promise<BackcasterSession> {
  const res = await request<unknown>("/sessions", {
    method: "POST",
    body: JSON.stringify(body),
  });
  const session = unwrap<BackcasterSession>(res);
  if (!session?.id) {
    throw new BackcasterError("Session was created but no session id was returned.", 500);
  }
  return session;
}

export async function interpret(body: {
  session_id: string;
  raw_input: string;
  context?: string;
}): Promise<{ interpretation: string; suggestedTitle?: string }> {
  const res = await request<unknown>("/interpret", {
    method: "POST",
    body: JSON.stringify(body),
  });

  const root = (res ?? {}) as {
    interpreted?: unknown;
    interpretation?: unknown;
    data?: { interpretation_paragraph?: unknown; suggested_title?: unknown };
  };

  let interpretation = "";
  let suggestedTitle: string | undefined;

  if (root.data && typeof root.data.interpretation_paragraph === "string") {
    interpretation = root.data.interpretation_paragraph;
    if (typeof root.data.suggested_title === "string") suggestedTitle = root.data.suggested_title;
  } else if (typeof root.interpretation === "string") {
    interpretation = root.interpretation;
  } else if (typeof root.interpreted === "string") {
    try {
      const parsed = JSON.parse(root.interpreted) as {
        interpretation_paragraph?: string;
        suggested_title?: string;
      };
      interpretation = parsed.interpretation_paragraph ?? "";
      suggestedTitle = parsed.suggested_title;
    } catch {
      interpretation = root.interpreted;
    }
  }

  return { interpretation, suggestedTitle };
}

export async function generate(body: {
  session_id: string;
  interpretation: string;
  mode_id: string;
  expand_leaves?: boolean;
}): Promise<OutputTree> {
  // Response contains backcaster_version including output_json (OutputTree).
  const raw = await request<unknown>("/generate", {
    method: "POST",
    body: JSON.stringify({ expand_leaves: false, ...body }),
  });
  const res = unwrap<{
    output_json?: OutputTree;
    backcaster_version?: { output_json?: OutputTree };
  }>(raw);
  const tree = res.backcaster_version?.output_json ?? res.output_json;
  if (!tree) throw new BackcasterError("No tree returned by the generator.", 500);
  return tree;
}

export function fillNode(body: {
  session_id: string;
  parent_node_id: string;
  context?: string;
}): Promise<OutputNode> {
  return request<OutputNode>("/fill-node", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function materialize(
  sessionId: string,
  body: { title_override?: string },
): Promise<{ project_id: string; objective_ids?: string[] }> {
  const res = await request<unknown>(`/sessions/${sessionId}/materialize`, {
    method: "POST",
    body: JSON.stringify(body),
  });

  const root = (res ?? {}) as Record<string, unknown>;
  const data = (root.data ?? root) as Record<string, unknown>;
  const projectId =
    (data.project_id as string) ??
    (data.init_id as string) ??
    (data.materialized_init_id as string) ??
    (data.id as string) ??
    (root.project_id as string);

  if (!projectId) {
    throw new BackcasterError("Project was created but no project id was returned.", 500);
  }

  const objectiveIds = (data.objective_ids ?? root.objective_ids) as string[] | undefined;
  return { project_id: projectId, objective_ids: objectiveIds };
}

export function getSession(sessionId: string): Promise<BackcasterSession> {
  return request<BackcasterSession>(`/sessions/${sessionId}`, { method: "GET" });
}

export const DEEP_LINK_BASE = "https://xcamp.xchange.eco/app/project";
