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
    const body: unknown = JSON.parse(rawText);
    const err = isRecord(body) ? body.error : undefined;
    const msg = typeof err === "string" ? err : isRecord(err) ? err.message : undefined;
    return isNonBlankString(msg) ? msg.trim() : fallback;
  } catch {
    return fallback;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonBlankString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isExtractedTask(value: unknown): value is ExtractedTask {
  return (
    isRecord(value) &&
    isNonBlankString(value.id) &&
    isNonBlankString(value.title) &&
    typeof value.est === "string" &&
    typeof value.due === "string"
  );
}

function isExtractedPerson(value: unknown): value is ExtractedPerson {
  return (
    isRecord(value) &&
    isNonBlankString(value.id) &&
    isNonBlankString(value.name) &&
    typeof value.initials === "string" &&
    typeof value.role === "string" &&
    typeof value.matched === "boolean" &&
    typeof value.email === "string" &&
    Array.isArray(value.tasks) &&
    value.tasks.length > 0 &&
    value.tasks.every(isExtractedTask)
  );
}

function parseExtractionResponse(rawText: string): ExtractedPerson[] {
  let body: unknown;
  try {
    body = rawText ? JSON.parse(rawText) : null;
  } catch {
    throw new TranscriptExtractionError("The extraction service returned invalid JSON.", 502);
  }

  if (!isRecord(body) || !Array.isArray(body.people) || !body.people.every(isExtractedPerson)) {
    throw new TranscriptExtractionError(
      "The extraction service returned an invalid response.",
      502,
    );
  }
  if (body.people.length === 0) {
    throw new TranscriptExtractionError(
      "Chi could not find any assigned work in this transcript. Check the file and try again.",
      422,
    );
  }

  const people = body.people.map((person) => ({
    ...person,
    id: person.id.trim(),
    name: person.name.trim(),
    email: person.email.trim(),
    tasks: person.tasks.map((task) => ({
      ...task,
      id: task.id.trim(),
      title: task.title.trim(),
    })),
  }));
  const personIds = new Set<string>();
  const taskIds = new Set<string>();
  for (const person of people) {
    if (personIds.has(person.id)) {
      throw new TranscriptExtractionError(
        "The extraction response contains duplicate people.",
        502,
      );
    }
    personIds.add(person.id);
    for (const task of person.tasks) {
      if (taskIds.has(task.id)) {
        throw new TranscriptExtractionError(
          "The extraction response contains duplicate tasks.",
          502,
        );
      }
      taskIds.add(task.id);
    }
  }

  return people;
}

export async function extractTranscript(
  text: string,
  signal?: AbortSignal,
): Promise<ExtractedPerson[]> {
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
      signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") throw error;
    throw new TranscriptExtractionError(
      "Could not reach the extraction service. Check your connection and try again.",
      0,
    );
  }

  const rawText = await res.text().catch(() => "");
  if (!res.ok) {
    throw new TranscriptExtractionError(extractErrorMessage(rawText, res.status), res.status);
  }

  return parseExtractionResponse(rawText);
}
