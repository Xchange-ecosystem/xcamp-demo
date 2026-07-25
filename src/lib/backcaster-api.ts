// Backcaster Quick Road API client — talks directly to the live xcampapi backend.
// Auth bearer token comes from the app's own Supabase session.
import { supabase } from "@/lib/supabase";

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

async function authToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new BackcasterError("You need to be signed in.", 401);
  return token;
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

export async function interpretFile(body: {
  file: File;
  session_id: string;
  mode_id?: string;
  context?: string;
}): Promise<{ interpretation: string; suggestedTitle?: string }> {
  const token = await authToken();
  const form = new FormData();
  form.append("file", body.file, body.file.name);
  form.append("session_id", body.session_id);
  if (body.mode_id) form.append("mode_id", body.mode_id);
  if (body.context?.trim()) form.append("context", body.context.trim());

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}/interpret-file`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
  } catch {
    throw new BackcasterError("Network error reaching the planner. Please try again.", 0);
  }

  if (!res.ok) {
    const rawText = await res.text().catch(() => "");
    throw new BackcasterError(extractErrorMessage(rawText, res.status), res.status);
  }

  const root = (await res.json()) as {
    interpreted?: unknown;
    data?: { interpretation_paragraph?: unknown; suggested_title?: unknown };
  };

  let interpretation = "";
  let suggestedTitle: string | undefined;

  if (root.data && typeof root.data.interpretation_paragraph === "string") {
    interpretation = root.data.interpretation_paragraph;
    if (typeof root.data.suggested_title === "string") suggestedTitle = root.data.suggested_title;
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

  // The API returns the tree in one of several shapes. Accept all of them.
  const raw = await request<unknown>("/generate", {
    method: "POST",
    body: JSON.stringify({
      session_id: sessionId,
      interpreted_input: interpretedInput,
      mode_id: modeId,
      expand_leaves: body.expand_leaves ?? false,
    }),
  });

  const tree = extractTree(raw);
  if (!tree) {
    console.error("[backcaster] /generate returned no usable tree", raw);
    throw new BackcasterError(
      "The planner responded but did not return a usable plan. Please try again.",
      500,
    );
  }
  return normalizeTree(tree);
}

// The backend has shipped the tree under several keys over time. Look in all
// known locations: data.output, data.output_json, backcaster_version.output_json,
// and the same keys at the root.
function extractTree(raw: unknown): OutputTree | null {
  if (!raw || typeof raw !== "object") return null;
  const root = raw as Record<string, unknown>;
  const data = (root.data && typeof root.data === "object" ? root.data : {}) as Record<string, unknown>;

  const candidates: unknown[] = [
    data.output,
    data.output_json,
    (data.backcaster_version as { output_json?: unknown } | undefined)?.output_json,
    root.output,
    root.output_json,
    (root.backcaster_version as { output_json?: unknown } | undefined)?.output_json,
  ];

  for (const c of candidates) {
    if (c && typeof c === "object" && Array.isArray((c as { root_nodes?: unknown }).root_nodes)) {
      return c as OutputTree;
    }
  }
  return null;
}

const KNOWN_NODE_TYPES: OutputNodeType[] = ["project", "objective", "note", "task"];

// The API sometimes returns node_type values like "object" that the UI does not
// recognize. Coerce unknown types to a safe default and guarantee children/title.
function normalizeNode(raw: unknown): OutputNode | null {
  if (!raw || typeof raw !== "object") return null;
  const n = raw as Record<string, unknown>;
  const rawType = typeof n.node_type === "string" ? n.node_type : "";
  const node_type = (KNOWN_NODE_TYPES.includes(rawType as OutputNodeType)
    ? rawType
    : "objective") as OutputNodeType;
  const children = Array.isArray(n.children)
    ? n.children.map(normalizeNode).filter((c): c is OutputNode => c !== null)
    : [];
  return {
    id: typeof n.id === "string" ? n.id : crypto.randomUUID(),
    node_type,
    title: typeof n.title === "string" ? n.title : "Untitled",
    description: typeof n.description === "string" ? n.description : "",
    children,
    success_criteria: Array.isArray(n.success_criteria) ? (n.success_criteria as string[]) : undefined,
    risks: Array.isArray(n.risks) ? (n.risks as string[]) : undefined,
  };
}

function normalizeTree(tree: OutputTree): OutputTree {
  return {
    title: tree.title || "Your plan",
    summary: tree.summary || "",
    mode: tree.mode || "",
    parameters: tree.parameters ?? {},
    root_nodes: (tree.root_nodes ?? [])
      .map(normalizeNode)
      .filter((n): n is OutputNode => n !== null),
  };
}

export async function fillNode(body: {
  session_id: string;
  interpreted_input: string;
  output_tree: OutputTree;
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
