// src/components/demo/companion/companionAltitudeFixtures.ts
// Static message history for the Companion-altitude chat column. Fixture
// content only — no real chat/AI wiring in this session (see
// demo.founder.companion.tsx's existing "lighter build for the demo"
// pattern, which this follows for the canned-reply-on-send behavior too).
import type { ChatMessage } from "@/components/companion/ChatThread";

export const COMPANION_ALTITUDE_THREAD: ChatMessage[] = [
  {
    id: "ca-1",
    kind: "chi",
    text: "Good to see you. Kenya Power's pilot has been open eleven days — want me to draft the follow-up proposal from your site-visit notes?",
  },
  { id: "ca-2", kind: "user", text: "What's blocking it right now?" },
  {
    id: "ca-3",
    kind: "chi",
    text: "Nothing formally — you just haven't sent it. I can turn the notes into a one-pager and queue it as a task for review.",
  },
  {
    id: "ca-4",
    kind: "user",
    text: "Do that, and flag anything else that needs my attention this week.",
  },
  {
    id: "ca-5",
    kind: "chi",
    text: "On it. Two tasks are due this week and one's already overdue — I've surfaced them in the panel on the right.",
  },
];

// Canned acknowledgement for anything typed into the composer — same "not a
// real backend call" pattern as demo.founder.companion.tsx.
export const COMPANION_ALTITUDE_ACK = "Got it — noted for this project.";
