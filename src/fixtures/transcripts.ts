import type { Transcript } from "./types";

// 3 sample meeting transcripts for the Admin screen (P1.4) demo — these are
// upload *inputs*: the Admin flow runs them through real chi-orchestration
// extraction rather than mocking the extraction output itself (per
// P1_Briefing.md, P1.4 is the one non-mock part of P1).
export const TRANSCRIPTS: Transcript[] = [
  {
    id: "transcript-1",
    title: "Solari Energy — weekly founder sync",
    date: "2026-09-02",
    participants: ["Maren Solberg", "Yuki Tanaka", "Kwame Boateng"],
    projectId: "proj-1",
    rawText: `Maren: Okay, quick sync before the Kenya Power call tomorrow. Yuki, where are we on the thermal stress test?
Yuki: Enclosure passed the first cycle, but I want to re-run it at 45C ambient before I sign off. Should have results by Thursday the 10th.
Maren: Good, let's get that done before we quote them a ship date. Kwame, is the pilot proposal deck ready?
Kwame: Almost — I need the updated BOM cost numbers from Yuki's controller redesign to finish the pricing slide.
Yuki: I'll send you the BOM today.
Maren: Great. Kwame, can you have the deck done by Monday the 8th? I want to walk through it with Ingrid before we send it to Kenya Power.
Kwame: Yep, Monday works.
Maren: Also — I want to schedule the actual site visit. Let's target the week of the 12th, I'll reach out to their ops lead.
Yuki: One more thing, we still need three manufacturer quotes before we can lock the BOM. I haven't started on that.
Maren: Let's get that moving too, it's blocking the cost numbers.`,
  },
  {
    id: "transcript-2",
    title: "Loopwell Health — clinical + product check-in",
    date: "2026-08-29",
    participants: ["Priya Nandakumar", "Elena Vasquez", "Sofia Lindqvist"],
    projectId: "proj-5",
    rawText: `Priya: The FDA reviewer sent back comments on the 510(k) package — nothing major, but I want to get responses drafted this week.
Sofia: I can pull the supporting data they're asking about from the pilot cohort. Give me until Thursday.
Priya: Perfect, that lines up with when I need to finalize the clinical study report anyway.
Elena: On the product side, I've got wireframes for the coaching notification flow — the tricky part is timing nudges around meal logging without being annoying.
Priya: Let's aim to have that design reviewed by the 9th so engineering can start on the model tuning in parallel.
Sofia: I'll also start tuning the nudge model against the pilot cohort data once the design is locked, target the same date.
Priya: Sounds good. Let's also flag — we should sign the second pilot clinic this week, legal cleared the redlines yesterday.
Elena: I'll loop in Kwame on the clinic marketing materials once that's signed.`,
  },
  {
    id: "transcript-3",
    title: "Northlight Robotics — Ørsted trial debrief",
    date: "2026-09-01",
    participants: ["Tomas Reyes", "Sofia Lindqvist", "Yuki Tanaka"],
    projectId: "proj-7",
    rawText: `Tomas: Week two of the offshore trial wrapped with zero missed inspections, which is great. I want a results summary ready for Ørsted by the 21st.
Sofia: I can put that together — I'll pull the flight logs and camera calibration data into a single report.
Tomas: Can you also review this week's flight logs specifically? I want to make sure nothing's flagged before we send anything to Ørsted.
Sofia: Sure, I'll do that review first, then roll it into the bigger summary.
Yuki: Separately — I looked at the BOM again and rotor cost is still our biggest line item. We should look for a cheaper supplier before we scale production.
Tomas: Agreed, that's not urgent but let's get someone sourcing alternatives. Nobody's picked that up yet.
Tomas: Great work everyone, this trial is going a long way toward de-risking the next funding conversation.`,
  },
];

export function getTranscriptById(id: string): Transcript | undefined {
  return TRANSCRIPTS.find((t) => t.id === id);
}
