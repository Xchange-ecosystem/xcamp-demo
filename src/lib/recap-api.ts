// Recap — client for the two Vercel serverless functions under `api/recap/`
// and the two public SECURITY DEFINER RPCs.
//
// Recap is deliberately separate from the /demo/* walkthrough: every call in
// this file hits real infrastructure. Real Claude extraction, real Supabase
// rows, real SendGrid email. Nothing here is fixture-backed and nothing here
// is reachable from a persona nav rail.
//
// Two constraints worth knowing before reading further:
//
//   1. `api/recap/*` only runs on a deployed Vercel environment. `bun run dev`
//      is plain `vite dev`, which serves the SPA and knows nothing about
//      `api/`, so extraction and publishing cannot be exercised locally.
//      postJson below turns that case into a legible error rather than a
//      JSON parse crash.
//   2. The three recap tables have RLS enabled with zero policies, so neither
//      `anon` nor `authenticated` can read them directly. The public page's
//      only route to the data is `get_recap_by_token`, which is SECURITY
//      DEFINER with EXECUTE granted to `anon`.
import { supabase } from "@/lib/supabase";

const EXTRACT_ENDPOINT = "/api/recap/extract";
const PUBLISH_ENDPOINT = "/api/recap/publish";

export class RecapApiError extends Error {
  status: number;
  detail?: string;
  constructor(message: string, status: number, detail?: string) {
    super(message);
    this.name = "RecapApiError";
    this.status = status;
    this.detail = detail;
  }
}

async function postJson<T>(endpoint: string, body: unknown, signal?: AbortSignal): Promise<T> {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });

  const raw = await res.text();
  let parsed: unknown = null;
  if (raw) {
    try {
      parsed = JSON.parse(raw);
    } catch {
      // A non-JSON body here is almost always the serverless function not
      // running at all — `vite dev` (which returns the SPA or a 404 page for
      // /api/*), or an edge-level error page ahead of the function.
      throw new RecapApiError(
        `${endpoint} did not return JSON (HTTP ${res.status}). The Recap endpoints only run on a deployed Vercel environment, not under \`vite dev\`.`,
        res.status,
      );
    }
  }

  if (!res.ok) {
    const err = parsed as { error?: string; detail?: string } | null;
    throw new RecapApiError(
      err?.error ?? `Request failed (HTTP ${res.status})`,
      res.status,
      err?.detail,
    );
  }

  return parsed as T;
}

// ── Extraction ────────────────────────────────────────────────────────────────

/** One follow-up exactly as `api/recap/extract.ts` returns it. */
export interface ExtractedFollowup {
  owner_name: string;
  task_title: string;
  task_description?: string;
  illustrative_value?: number;
}

/**
 * Sends the transcript to `api/recap/extract`, which runs the real Claude call
 * server-side. The transcript is never persisted — not by the endpoint, not
 * here. Expect several seconds of latency; this is not the demo's fake delay.
 */
export async function extractFollowups(
  transcript: string,
  signal?: AbortSignal,
): Promise<ExtractedFollowup[]> {
  const data = await postJson<{ followups?: ExtractedFollowup[] }>(
    EXTRACT_ENDPOINT,
    { transcript },
    signal,
  );
  return data.followups ?? [];
}

// ── Publishing ────────────────────────────────────────────────────────────────

export interface PublishRecapInput {
  title: string;
  organization: string;
  meeting_date: string;
  presenter_name: string;
  followups: ExtractedFollowup[];
  recipients: { name: string; email: string }[];
  /** Literal — `publish.ts` substitutes placeholders in the body only. */
  email_subject: string;
  /** Supports {first_name} and {recap_url}. */
  email_body_template: string;
}

export interface PublishRecapResult {
  session_id: string;
  recipients: { name: string; email: string; url: string }[];
  email_results: { email: string; sent: boolean }[];
}

/**
 * The irreversible step: creates the session, follow-ups and recipients, then
 * sends one email per recipient. There is no unsend and no edit-after-send.
 */
export async function publishRecap(input: PublishRecapInput): Promise<PublishRecapResult> {
  return postJson<PublishRecapResult>(PUBLISH_ENDPOINT, input);
}

// ── Public page (no auth) ─────────────────────────────────────────────────────

export interface PublicRecapFollowup {
  id: string;
  owner_name: string;
  task_title: string;
  task_description: string | null;
  illustrative_value: number | null;
}

export type RecapResponse = "mine" | "not_mine";

export interface PublicRecap {
  session: {
    title: string;
    organization: string | null;
    meeting_date: string | null;
    presenter_name: string;
  };
  recipient: {
    name: string;
    /** The recipient's own last answer, or null if they haven't answered. */
    response: RecapResponse | null;
  };
  /** Every follow-up on the session — see the note in PublicRecapPage. */
  followups: PublicRecapFollowup[];
}

// `src/integrations/supabase/types.ts` is generated and predates these two
// functions, so the typed client doesn't know their names. Regenerating an
// 8,000-line file for two RPCs would bury this change in generated noise, so
// they go through an untyped view of the same client and the shapes are
// asserted here instead.
const untypedRpc = supabase.rpc.bind(supabase) as unknown as (
  fn: string,
  args: Record<string, unknown>,
) => PromiseLike<{ data: unknown; error: { message: string } | null }>;

/**
 * Resolves a recipient token to their recap, or null when the token is
 * unknown. The RPC also stamps `opened_at` on first call, so simply loading
 * the page is what records the open — there is nothing extra to fire.
 */
export async function getRecapByToken(token: string): Promise<PublicRecap | null> {
  const { data, error } = await untypedRpc("get_recap_by_token", { p_token: token });
  if (error) throw new Error(error.message);
  // An unknown token returns SQL NULL, which arrives as `null` with no error.
  if (data === null || data === undefined) return null;
  return data as PublicRecap;
}

/**
 * Records the recipient's answer. This is one answer per recipient, not per
 * follow-up: `recap_recipients.response` is a single column and the RPC takes
 * a single value. Last write wins.
 */
export async function setRecapResponse(token: string, response: RecapResponse): Promise<boolean> {
  const { data, error } = await untypedRpc("set_recap_response", {
    p_token: token,
    p_response: response,
  });
  if (error) throw new Error(error.message);
  return data === true;
}
