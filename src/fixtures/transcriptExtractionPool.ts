import type { FeedItem } from "./types";

// B3 — Founder Home's Transcript tab extraction-result fixtures.
//
// Fixture-only and content-blind by design: whatever the presenter pastes,
// types, or drops on the Transcript tab is never read. "Send to Chi" always
// samples a random 2-4 of these pre-baked results instead. This is distinct
// from the real Extract pipeline (TranscriptOverlay.tsx + transcripts-api.ts),
// which stays in the repo unused by Founder Home for now — reserved for a
// future /admin/recap session — and must never be called from here.
export type TranscriptExtractionFixture = Pick<
  FeedItem,
  "title" | "description" | "projectId" | "assigneeId" | "agreementState"
>;

export const TRANSCRIPT_EXTRACTION_POOL: TranscriptExtractionFixture[] = [
  {
    title: "Draft follow-up email to Northlight on payment terms",
    description: "Mentioned near the end of the call — no owner assigned yet.",
    projectId: "proj-7",
    assigneeId: null,
    agreementState: "sketch",
  },
  {
    title: "Schedule site visit for the Kenya Power pilot",
    description: "Kwame confirmed availability the week of the 15th.",
    projectId: "proj-1",
    assigneeId: "person-8",
    agreementState: "agreement",
  },
  {
    title: "Investigate the ARM64 quantization regression root cause",
    description: "Flagged as blocking the next Fernbase release candidate.",
    projectId: "proj-3",
    assigneeId: "person-9",
    agreementState: "sketch",
  },
  {
    title: "Send updated cycle-test data to the UL lab",
    description: "Referenced as a hard deadline for certification.",
    projectId: "proj-2",
    assigneeId: "person-9",
    agreementState: "agreement",
  },
  {
    title: "Loop in Ingrid on the Q3 board deck timing",
    description: "Investor update mentioned but not yet drafted.",
    projectId: "proj-1",
    assigneeId: null,
    agreementState: "sketch",
  },
  {
    title: "Confirm flight-log export cadence with Ørsted",
    description: "Weekly export was discussed as the new default.",
    projectId: "proj-7",
    assigneeId: "person-10",
    agreementState: "agreement",
  },
  {
    title: "Draft revised pilot pricing for Kenya Power",
    description: "Numbers were floated verbally, need a written version.",
    projectId: "proj-1",
    assigneeId: "person-8",
    agreementState: "sketch",
  },
  {
    title: "Assign a QA pass on the telemetry dashboard update",
    description: "Came up as a blocker for next week's demo.",
    projectId: "proj-3",
    assigneeId: "person-9",
    agreementState: "agreement",
  },
];

function shuffled<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Picks a random 2-4 item sample. Takes no input on purpose — callers must
 *  not derive the count or selection from anything the presenter typed or
 *  dropped, keeping the extraction content-blind. */
export function pickTranscriptExtractions(): TranscriptExtractionFixture[] {
  const count = 2 + Math.floor(Math.random() * 3);
  return shuffled(TRANSCRIPT_EXTRACTION_POOL).slice(0, count);
}
