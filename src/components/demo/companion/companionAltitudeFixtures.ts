// src/components/demo/companion/companionAltitudeFixtures.ts
// Static message history for the Companion-altitude chat column, one thread
// per persona (Founder/Investor/Collaborator all get their own Companion
// shell now — see DemoShell/useDemoAltitude). Fixture content only. Sending
// a message does trigger a real model call now (see CompanionAltitudeShell's
// handleSend / api/companion/chat.ts) — COMPANION_ALTITUDE_ACK below is kept
// only as the fallback reply if that call fails, not the normal path.
import type { ChatMessage } from "@/components/companion/ChatThread";
import type { DemoPersona } from "@/components/demo/DemoNavRail";

const FOUNDER_THREAD: ChatMessage[] = [
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

const INVESTOR_THREAD: ChatMessage[] = [
  {
    id: "ca-inv-1",
    kind: "chi",
    text: "Welcome back. Solari Energy just posted its strongest week yet — up to rank #1 in your portfolio. Want a quick read on what's driving it?",
  },
  { id: "ca-inv-2", kind: "user", text: "What changed since last week?" },
  {
    id: "ca-inv-3",
    kind: "chi",
    text: "Performance score climbed from 91 to 94, mostly certified objectives clearing faster than the week before. A couple of other names in your portfolio are trending the other way — I can flag them.",
  },
  { id: "ca-inv-4", kind: "user", text: "Flag them, and anything new worth a look." },
  {
    id: "ca-inv-5",
    kind: "chi",
    text: "Done — surfaced in the panel on the right, along with the top of your ranked list.",
  },
];

const COLLABORATOR_THREAD: ChatMessage[] = [
  {
    id: "ca-col-1",
    kind: "chi",
    text: "Hey Claas — you've got one assignment awaiting your acceptance and one overdue for proof. Want the rundown?",
  },
  { id: "ca-col-2", kind: "user", text: "What's overdue?" },
  {
    id: "ca-col-3",
    kind: "chi",
    text: "The UL lab follow-up on Solari Storage — due 5 Sep, still needs proof attached. Everything else is on track.",
  },
  { id: "ca-col-4", kind: "user", text: "Remind me what's already settled this month." },
  {
    id: "ca-col-5",
    kind: "chi",
    text: "180 cr from the v2 controller BOM and 140 cr from the UL 1974 samples — both released to your wallet. Full breakdown's in the panel on the right.",
  },
];

export const COMPANION_ALTITUDE_THREAD: Record<DemoPersona, ChatMessage[]> = {
  founder: FOUNDER_THREAD,
  investor: INVESTOR_THREAD,
  collaborator: COLLABORATOR_THREAD,
};

// Canned acknowledgement for anything typed into the composer — not a real
// backend call.
export const COMPANION_ALTITUDE_ACK = "Got it — noted.";
