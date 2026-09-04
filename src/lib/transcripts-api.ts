// Transcript-to-assignments extraction — talks to xcamp-backend's real
// /api/transcripts/extract endpoint (P1.4). This is the one input mode that
// isn't mocked: the request goes out over the network for real.
import { supabase } from "@/lib/supabase";

const BASE_URL = ((import.meta.env.VITE_BACKEND_API_URL as string | undefined) ?? "").replace(
  /\/$/,
  "",
);

export interface ExtractedTask {
  id: string;
  title: string;
  est: string;
  due: string;
}

export interface ExtractedPerson {
  id: string;
  name: string;
  initials: string;
  role: string;
  matched: boolean;
  email: string;
  tasks: ExtractedTask[];
}

export class TranscriptExtractionError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "TranscriptExtractionError";
    this.status = status;
  }
}

function extractErrorMessage(rawText: string, status: number): string {
  const fallback = `Extraction failed (${status}). Please try again.`;
  if (!rawText) return fallback;
  try {
    const body = JSON.parse(rawText) as Record<string, unknown>;
    const err = body.error as { message?: string } | string | undefined;
    const msg = typeof err === "string" ? err : err?.message;
    return msg || fallback;
  } catch {
    return fallback;
  }
}

export async function extractTranscript(text: string): Promise<ExtractedPerson[]> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new TranscriptExtractionError("You need to be signed in.", 401);

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}/api/transcripts/extract`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ text }),
    });
  } catch {
    throw new TranscriptExtractionError(
      "Could not reach the extraction service. Check your connection and try again.",
      0,
    );
  }

  const rawText = await res.text().catch(() => "");
  if (!res.ok) {
    throw new TranscriptExtractionError(extractErrorMessage(rawText, res.status), res.status);
  }

  const body = rawText ? (JSON.parse(rawText) as { people?: ExtractedPerson[] }) : {};
  return Array.isArray(body.people) ? body.people : [];
}
