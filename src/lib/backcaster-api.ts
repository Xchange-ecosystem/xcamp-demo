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

function asReadable(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "string") return value.trim() || null;
  if (Array.isArray(value)) {
    const parts = value
      .map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object") {
          const o = item as { msg?: unknown; message?: unknown; loc?: unknown };
          const m = o.msg ?? o.message;
          const loc = Array.isArray(o.loc) ? o.loc.join(".") : undefined;
          if (typeof m === "string") return loc ? `${loc}: ${m}` : m;
        }
        return null;
      })
      .filter(Boolean);
    return parts.length ? parts.join("; ") : null;
  }
  if (typeof value === "object") {
    const o = value as Record<string, unknown>;
    return (
      asReadable(o.detail) ??
      asReadable(o.message) ??
      asReadable(o.error) ??
      asReadable(o.errors) ??
      JSON.stringify(value)
    );
  }
  return String(value);
}

function extractErrorMessage(rawText: string, status: number): string {
  const fallback = `Request failed (${status}).`;
  if (!rawText) return fallback;
  try {
    const body = JSON.parse(rawText) as unknown;
    return (
      asReadable((body as Record<string, unknown>)?.detail) ??
      asReadable((body as Record<string, unknown>)?.message) ??
      asReadable((body as Record<string, unknown>)?.error) ??
      asReadable((body as Record<string, unknown>)?.errors) ??
      asReadable(body) ??
      rawText.slice(0, 300) ??
      fallback
    );
  } catch {
    return rawText.slice(0, 300) || fallback;
  }
}

// Retry only transient failures (gateway timeouts / network blips), never 4xx.
const TRANSIENT_STATUS = new Set([502, 503, 504]);
const MAX_RETRIES = 2;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = await authHeaders();

  let lastErr: unknown;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    let res: Response;
    try {
      res = await fetch(`${BASE_URL}${path}`, {
        ...init,
        headers: { ...headers, ...(init?.headers ?? {}) },
      });
    } catch (networkErr) {
      // Network-level failure (offline, DNS, aborted) — treat as transient.
      lastErr = new BackcasterError(
        "Network error reaching the planner. Please try again.",
        0,
      );
      if (attempt < MAX_RETRIES) {
        await sleep(600 * (attempt + 1));
        continue;
      }
      throw lastErr;
    }

    if (!res.ok) {
      const rawText = await res.text().catch(() => "");
      console.error(`[backcaster] ${path} ${res.status}`, rawText);
      const message = extractErrorMessage(rawText, res.status);
      const err = new BackcasterError(message, res.status);

      if (TRANSIENT_STATUS.has(res.status) && attempt < MAX_RETRIES) {
        lastErr = err;
        await sleep(600 * (attempt + 1));
        continue;
      }
      throw err;
    }

    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  }

  // Exhausted retries on transient errors.
  throw lastErr ?? new BackcasterError("Request failed after retries.", 504);
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
  // The API requires session_id, interpreted_input, and mode_id.
  const interpretedInput = (body.interpretation ?? "").trim();
  const sessionId = (body.session_id ?? "").trim();
  const modeId = (body.mode_id ?? "").trim();

  const missing: string[] = [];
  if (!sessionId) missing.push("session_id");
  if (!interpretedInput) missing.push("interpreted_input");
  if (!modeId) missing.push("mode_id");
  if (missing.length) {
    throw new BackcasterError(
      `Cannot generate the plan — missing: ${missing.join(", ")}.`,
      400,
    );
  }

  // Response contains backcaster_version including output_json (OutputTree).
  const raw = await request<unknown>("/generate", {
    method: "POST",
    body: JSON.stringify({
      session_id: sessionId,
      interpreted_input: interpretedInput,
      mode_id: modeId,
      expand_leaves: body.expand_leaves ?? false,
    }),
  });
  const res = unwrap<{
    output_json?: OutputTree;
    backcaster_version?: { output_json?: OutputTree };
  }>(raw);
  const tree = res.backcaster_version?.output_json ?? res.output_json;
  if (!tree) throw new BackcasterError("No tree returned by the generator.", 500);
  return tree;
}

export async function fillNode(body: {
  session_id: string;
  parent_node_id: string;
  context?: string;
}): Promise<OutputNode> {
  const res = await request<unknown>("/fill-node", {
    method: "POST",
    body: JSON.stringify(body),
  });
  return unwrap<OutputNode>(res);
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

export async function getSession(sessionId: string): Promise<BackcasterSession> {
  const res = await request<unknown>(`/sessions/${sessionId}`, { method: "GET" });
  return unwrap<BackcasterSession>(res);
}

export const DEEP_LINK_BASE = "https://xcamp.xchange.eco/app/project";
