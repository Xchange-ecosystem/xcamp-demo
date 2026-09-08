import type { ExtractedPerson } from "@/lib/transcripts-api";

// B3 (revised) — Founder Home's Transcript tab keeps the real Extract ->
// Review -> Preview -> (simulated) Send pipeline built in TranscriptOverlay.tsx
// exactly as it is. Only the Extract step's data source changes: instead of
// calling xcamp-backend's real /api/transcripts/extract (which fails for any
// unauthenticated demo viewer — see the session's Phase 0 report), it draws
// from this fixture pool, content-blind (whatever was typed or dropped is
// never read). The shape matches ExtractedPerson[] field-for-field so
// TranscriptOverlay's Review/Preview/Send steps need zero changes.
export const TRANSCRIPT_EXTRACTION_POOL: ExtractedPerson[] = [
  {
    id: "fixture-person-1",
    name: "Kwame Boateng",
    initials: "KB",
    role: "Growth Marketer",
    matched: true,
    email: "kwame@collabs.example",
    tasks: [
      {
        id: "fixture-task-1a",
        title: "Draft follow-up email to Northlight on payment terms",
        est: "~30 min",
        due: "no deadline mentioned",
      },
      {
        id: "fixture-task-1b",
        title: "Schedule site visit for the Kenya Power pilot",
        est: "~15 min",
        due: "by the 15th",
      },
    ],
  },
  {
    id: "fixture-person-2",
    name: "Yuki Tanaka",
    initials: "YT",
    role: "Backend Engineer",
    matched: true,
    email: "yuki@collabs.example",
    tasks: [
      {
        id: "fixture-task-2a",
        title: "Investigate the ARM64 quantization regression root cause",
        est: "~1 day",
        due: "before the next release candidate",
      },
    ],
  },
  {
    id: "fixture-person-3",
    name: "Sofia Lindqvist",
    initials: "SL",
    role: "Data Analyst",
    matched: true,
    email: "sofia@collabs.example",
    tasks: [
      {
        id: "fixture-task-3a",
        title: "Send updated cycle-test data to the UL lab",
        est: "~2h",
        due: "hard deadline — Friday",
      },
      {
        id: "fixture-task-3b",
        title: "Confirm flight-log export cadence with Ørsted",
        est: "~20 min",
        due: "weekly, starting next Monday",
      },
    ],
  },
  {
    id: "fixture-person-4",
    name: "Ben Okafor",
    initials: "BO",
    role: "Community Lead",
    matched: true,
    email: "ben@collabs.example",
    tasks: [
      {
        id: "fixture-task-4a",
        title: "Loop in Ingrid on the Q3 board deck timing",
        est: "~10 min",
        due: "no deadline mentioned",
      },
    ],
  },
  {
    id: "fixture-person-5",
    name: "Priya Nandakumar",
    initials: "PN",
    role: "Founder, Loopwell Health",
    matched: true,
    email: "priya@loopwell.example",
    tasks: [
      {
        id: "fixture-task-5a",
        title: "Review FDA pre-submission feedback",
        est: "~45 min",
        due: "before next week's sync",
      },
    ],
  },
  {
    id: "fixture-person-6",
    name: "Marcus Chen",
    initials: "MC",
    role: "External — audio contractor",
    matched: false,
    email: "",
    tasks: [
      {
        id: "fixture-task-6a",
        title: "Deliver the cleaned-up call recording",
        est: "~1 day",
        due: "no deadline mentioned",
      },
      {
        id: "fixture-task-6b",
        title: "Send an invoice for August hours",
        est: "~15 min",
        due: "end of month",
      },
    ],
  },
  {
    id: "fixture-person-7",
    name: "Elena Vasquez",
    initials: "EV",
    role: "Product Designer",
    matched: true,
    email: "elena@collabs.example",
    tasks: [
      {
        id: "fixture-task-7a",
        title: "Assign a QA pass on the telemetry dashboard update",
        est: "~2h",
        due: "blocker for next week's demo",
      },
    ],
  },
  {
    id: "fixture-person-8",
    name: "Dana Whitfield",
    initials: "DW",
    role: "External — prospective pilot partner",
    matched: false,
    email: "",
    tasks: [
      {
        id: "fixture-task-8a",
        title: "Draft revised pilot pricing for Kenya Power",
        est: "~1h",
        due: "no deadline mentioned",
      },
    ],
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

/** Picks a random 2-4 person sample, each with a fresh unique id (the real
 *  overlay keys/mutates people by id). Takes no input on purpose — callers
 *  must not derive the count or selection from anything the presenter typed
 *  or dropped, keeping the extraction content-blind. */
function pickTranscriptExtractions(): ExtractedPerson[] {
  const count = 2 + Math.floor(Math.random() * 3);
  return shuffled(TRANSCRIPT_EXTRACTION_POOL)
    .slice(0, count)
    .map((person, i) => ({ ...person, id: `${person.id}-${Date.now()}-${i}` }));
}

/** Drop-in, content-blind replacement for transcripts-api.ts's extractTranscript —
 *  same Promise<ExtractedPerson[]> contract, same abort-signal cancellation
 *  behavior, but resolves from the fixture pool above after a brief random
 *  delay instead of calling xcamp-backend. transcripts-api.ts itself is left
 *  untouched; this only replaces the one call site in TranscriptOverlay.tsx. */
export function simulateTranscriptExtraction(signal?: AbortSignal): Promise<ExtractedPerson[]> {
  return new Promise((resolve, reject) => {
    const delayMs = 1500 + Math.random() * 1000;
    const timer = setTimeout(() => resolve(pickTranscriptExtractions()), delayMs);
    signal?.addEventListener("abort", () => {
      clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    });
  });
}
