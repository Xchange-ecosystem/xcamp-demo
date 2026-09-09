import type { ObjectiveEvent } from "./types";
import { OBJECTIVES } from "./objectives";

// Objective movement history — the record behind the single current
// `Objective.status`. Fixture-only (see the ObjectiveEvent doc comment in
// types.ts); production reconstructs this from audit rows rather than a
// typed event table.
//
// Coverage is deliberately uneven. proj-1 (Solari Energy) carries a full
// log for all ten objectives because it is the demo subject — it is the
// project the Evolution and Readiness screens read, and a reflective review
// needs more than one datum per objective to say anything. Every other
// project carries a minimal two-event log (creation, plus the transition
// into its current status) so no objective is history-less and so any
// consumer written against proj-1 degrades gracefully elsewhere, without
// hand-authoring eight more project narratives that nothing reads.
//
// Every `at` is consistent with its objective's `startedAt`, `completedAt`
// and `updatedAt`: the first `* -> in_progress` event matches `startedAt`,
// the last `* -> done` event matches `completedAt`, and the final event's
// date matches `updatedAt`. A `from === to` event records movement that did
// not change status (a resume after a stall, or a finding filed against
// already-closed work) — see the convention note in types.ts.
export const OBJECTIVE_EVENTS: ObjectiveEvent[] = [
  // ── proj-1 · obj-18 — the founding deployment. Twelve sites, six months
  //    of commissioning, clean throughout. The project's strongest run. ──
  {
    id: "oev-1",
    objectiveId: "obj-18",
    at: "2026-01-08",
    from: null,
    to: "open",
    actorId: "person-1",
    note: "Carried over from the v1 pilot plan.",
  },
  {
    id: "oev-2",
    objectiveId: "obj-18",
    at: "2026-01-15",
    from: "open",
    to: "in_progress",
    actorId: "person-1",
    note: null,
  },
  {
    id: "oev-3",
    objectiveId: "obj-18",
    at: "2026-02-18",
    from: "in_progress",
    to: "in_progress",
    actorId: "person-9",
    note: "Sites one to four commissioned.",
  },
  {
    id: "oev-4",
    objectiveId: "obj-18",
    at: "2026-03-24",
    from: "in_progress",
    to: "in_progress",
    actorId: "person-9",
    note: "Sites five to nine commissioned.",
  },
  {
    id: "oev-5",
    objectiveId: "obj-18",
    at: "2026-04-28",
    from: "in_progress",
    to: "in_progress",
    actorId: "person-9",
    note: "Twelve sites live. Uptime clock starts.",
  },
  {
    id: "oev-6",
    objectiveId: "obj-18",
    at: "2026-06-02",
    from: "in_progress",
    to: "in_progress",
    actorId: "person-9",
    note: "Four months of telemetry filed; no controller failures.",
  },
  {
    id: "oev-7",
    objectiveId: "obj-18",
    at: "2026-07-06",
    from: "in_progress",
    to: "in_progress",
    actorId: "person-9",
    note: "Uptime holding at 99.1% across the deployment.",
  },
  {
    id: "oev-8",
    objectiveId: "obj-18",
    at: "2026-07-22",
    from: "in_progress",
    to: "done",
    actorId: "person-1",
    note: "Twelve sites through nine months of operation at 99.1% controller uptime.",
  },
  // ── proj-1 · obj-1 — the stall. The oldest live thread in the project,
  //    in progress since February and still not done. Sat still for six
  //    weeks over the summer while the cell-supplier failure was worked
  //    through — the largest gap anywhere in this project's history. ──
  {
    id: "oev-9",
    objectiveId: "obj-1",
    at: "2026-02-02",
    from: null,
    to: "open",
    actorId: "person-1",
    note: "v1 unit cost is what keeps operators out. Redesign the board around it.",
  },
  {
    id: "oev-10",
    objectiveId: "obj-1",
    at: "2026-02-09",
    from: "open",
    to: "in_progress",
    actorId: "person-9",
    note: null,
  },
  {
    id: "oev-11",
    objectiveId: "obj-1",
    at: "2026-03-10",
    from: "in_progress",
    to: "in_progress",
    actorId: "person-9",
    note: "First board spin back from fab; thermal margin short of target.",
  },
  {
    id: "oev-12",
    objectiveId: "obj-1",
    at: "2026-04-08",
    from: "in_progress",
    to: "in_progress",
    actorId: "person-9",
    note: "Second spin ordered against a revised power stage.",
  },
  {
    id: "oev-13",
    objectiveId: "obj-1",
    at: "2026-05-06",
    from: "in_progress",
    to: "in_progress",
    actorId: "person-9",
    note: "Cost model updated against the v1 BOM.",
  },
  {
    id: "oev-14",
    objectiveId: "obj-1",
    at: "2026-06-05",
    from: "in_progress",
    to: "in_progress",
    actorId: "person-9",
    note: "Board redesign paused — the cell spec it was drawn against was no longer safe to assume.",
  },
  {
    id: "oev-15",
    objectiveId: "obj-1",
    at: "2026-07-20",
    from: "in_progress",
    to: "in_progress",
    actorId: "person-9",
    note: "Picked back up after six weeks with no movement, redrawn against the replacement cell.",
  },
  {
    id: "oev-16",
    objectiveId: "obj-1",
    at: "2026-08-20",
    from: "in_progress",
    to: "in_progress",
    actorId: "person-9",
    note: "BOM finalized for the v2 board.",
  },
  // ── proj-1 · obj-23 — the setback. Closed early on a supplier whose cells
  //    then failed cycle testing; the assessment scored the thin evidence. ──
  {
    id: "oev-17",
    objectiveId: "obj-23",
    at: "2026-04-13",
    from: null,
    to: "open",
    actorId: "person-1",
    note: "Single-sourced cells were the biggest schedule risk on the v1 build.",
  },
  {
    id: "oev-18",
    objectiveId: "obj-23",
    at: "2026-04-20",
    from: "open",
    to: "in_progress",
    actorId: "person-9",
    note: null,
  },
  {
    id: "oev-19",
    objectiveId: "obj-23",
    at: "2026-05-29",
    from: "in_progress",
    to: "done",
    actorId: "person-1",
    note: "Closed on the first supplier before the full cycle-test round came back.",
  },
  {
    id: "oev-20",
    objectiveId: "obj-23",
    at: "2026-06-08",
    from: "done",
    to: "done",
    actorId: "person-9",
    note: "Cells failed at 400 cycles after the objective closed. Assessed at 58 — the evidence filed did not support the call.",
  },
  // ── proj-1 · obj-21 — the re-open. First manufacturer qualified in July,
  //    then lost its certification; the second pass closed lower. ──
  {
    id: "oev-21",
    objectiveId: "obj-21",
    at: "2026-05-11",
    from: null,
    to: "open",
    actorId: "person-1",
    note: "Opened off the back of the cell-supplier failure — qualify the manufacturer properly this time.",
  },
  {
    id: "oev-22",
    objectiveId: "obj-21",
    at: "2026-05-18",
    from: "open",
    to: "in_progress",
    actorId: "person-1",
    note: null,
  },
  {
    id: "oev-23",
    objectiveId: "obj-21",
    at: "2026-06-15",
    from: "in_progress",
    to: "in_progress",
    actorId: "person-1",
    note: "First audit scheduled with the Nakuru plant.",
  },
  {
    id: "oev-24",
    objectiveId: "obj-21",
    at: "2026-07-09",
    from: "in_progress",
    to: "done",
    actorId: "person-1",
    note: "First manufacturer qualified against ISO 9001.",
  },
  {
    id: "oev-25",
    objectiveId: "obj-21",
    at: "2026-07-27",
    from: "done",
    to: "in_progress",
    actorId: "person-1",
    note: "Re-opened: the partner lost its ISO 9001 certification at surveillance audit and withdrew from the quote.",
  },
  {
    id: "oev-26",
    objectiveId: "obj-21",
    at: "2026-08-28",
    from: "in_progress",
    to: "done",
    actorId: "person-1",
    note: "Second manufacturer qualified. Assessed at 74 against the first pass's 85 — the second audit ran on a compressed timeline with less filed behind it.",
  },
  // ── proj-1 · obj-17 — demand validation. The project's strongest result. ──
  {
    id: "oev-27",
    objectiveId: "obj-17",
    at: "2026-02-24",
    from: null,
    to: "open",
    actorId: "person-1",
    note: "Raised once operator conversations pointed at demand, not supply, as the open question.",
  },
  {
    id: "oev-28",
    objectiveId: "obj-17",
    at: "2026-03-02",
    from: "open",
    to: "in_progress",
    actorId: "person-1",
    note: null,
  },
  {
    id: "oev-29",
    objectiveId: "obj-17",
    at: "2026-04-07",
    from: "in_progress",
    to: "in_progress",
    actorId: "person-8",
    note: "Survey instrument piloted in Kisumu county.",
  },
  {
    id: "oev-30",
    objectiveId: "obj-17",
    at: "2026-05-11",
    from: "in_progress",
    to: "in_progress",
    actorId: "person-8",
    note: "Second county field round complete.",
  },
  {
    id: "oev-31",
    objectiveId: "obj-17",
    at: "2026-06-14",
    from: "in_progress",
    to: "done",
    actorId: "person-1",
    note: "Survey closed at 340 households across three counties.",
  },
  // ── proj-1 · obj-19 — unit economics. ──
  {
    id: "oev-32",
    objectiveId: "obj-19",
    at: "2026-06-16",
    from: null,
    to: "open",
    actorId: "person-1",
    note: null,
  },
  {
    id: "oev-33",
    objectiveId: "obj-19",
    at: "2026-06-22",
    from: "open",
    to: "in_progress",
    actorId: "person-1",
    note: null,
  },
  {
    id: "oev-34",
    objectiveId: "obj-19",
    at: "2026-07-13",
    from: "in_progress",
    to: "in_progress",
    actorId: "person-1",
    note: "First pass on payback at 200 sites.",
  },
  {
    id: "oev-35",
    objectiveId: "obj-19",
    at: "2026-08-03",
    from: "in_progress",
    to: "done",
    actorId: "person-1",
    note: "Payback modeled at 500-site scale against the v2 cost target.",
  },
  // ── proj-1 · obj-20 — procurement path. ──
  {
    id: "oev-36",
    objectiveId: "obj-20",
    at: "2026-06-29",
    from: null,
    to: "open",
    actorId: "person-8",
    note: null,
  },
  {
    id: "oev-37",
    objectiveId: "obj-20",
    at: "2026-07-06",
    from: "open",
    to: "in_progress",
    actorId: "person-8",
    note: null,
  },
  {
    id: "oev-38",
    objectiveId: "obj-20",
    at: "2026-07-29",
    from: "in_progress",
    to: "in_progress",
    actorId: "person-8",
    note: "Nine of the fourteen operators interviewed.",
  },
  {
    id: "oev-39",
    objectiveId: "obj-20",
    at: "2026-08-19",
    from: "in_progress",
    to: "done",
    actorId: "person-1",
    note: "Fourteen licensed operators mapped alongside Kenya Power's own procurement route.",
  },
  // ── proj-1 · obj-22 — the standing contribution and evaluation ledger.
  //    Never completes by design; the filings below are what its
  //    proofCount of 11 is made of. ──
  {
    id: "oev-40",
    objectiveId: "obj-22",
    at: "2026-02-16",
    from: null,
    to: "open",
    actorId: "person-1",
    note: "Opened once the first collaborators were carrying assigned work.",
  },
  {
    id: "oev-41",
    objectiveId: "obj-22",
    at: "2026-02-20",
    from: "open",
    to: "in_progress",
    actorId: "person-1",
    note: null,
  },
  {
    id: "oev-42",
    objectiveId: "obj-22",
    at: "2026-03-20",
    from: "in_progress",
    to: "in_progress",
    actorId: "person-1",
    note: "First contributions filed against the deployment work.",
  },
  {
    id: "oev-43",
    objectiveId: "obj-22",
    at: "2026-04-24",
    from: "in_progress",
    to: "in_progress",
    actorId: "person-1",
    note: "Controller redesign contributions filed.",
  },
  {
    id: "oev-44",
    objectiveId: "obj-22",
    at: "2026-05-22",
    from: "in_progress",
    to: "in_progress",
    actorId: "person-1",
    note: "Supplier qualification contributions filed.",
  },
  {
    id: "oev-45",
    objectiveId: "obj-22",
    at: "2026-06-19",
    from: "in_progress",
    to: "in_progress",
    actorId: "person-1",
    note: "Survey fieldwork contributions filed.",
  },
  {
    id: "oev-46",
    objectiveId: "obj-22",
    at: "2026-07-24",
    from: "in_progress",
    to: "in_progress",
    actorId: "person-1",
    note: "Manufacturing audit contributions filed.",
  },
  {
    id: "oev-47",
    objectiveId: "obj-22",
    at: "2026-09-02",
    from: "in_progress",
    to: "in_progress",
    actorId: "person-1",
    note: "Latest assessor evaluations filed against the August deployment work.",
  },
  // ── proj-1 · obj-2 — the pilot, raised once the path was mapped. ──
  {
    id: "oev-48",
    objectiveId: "obj-2",
    at: "2026-08-24",
    from: null,
    to: "open",
    actorId: "person-1",
    note: "Raised once the procurement path was mapped.",
  },
  // ── proj-1 · obj-24 — raised, nothing filed against it yet. ──
  {
    id: "oev-49",
    objectiveId: "obj-24",
    at: "2026-08-26",
    from: null,
    to: "open",
    actorId: "person-1",
    note: "Raised after the unit-economics model landed. No proof filed against it yet.",
  },

  // ── Every other project: creation plus the move into its current status.
  //    Generated rather than hand-authored so these can never drift out of
  //    sync with OBJECTIVES as that array changes. ──
  ...buildMinimalLog(),
];

/** Creation-plus-current-status log for every objective outside proj-1.
 *  Dates come from the objective's own `startedAt`/`completedAt`/`updatedAt`
 *  so the generated rows satisfy the same consistency rules as the
 *  hand-authored proj-1 log above. */
function buildMinimalLog(): ObjectiveEvent[] {
  const events: ObjectiveEvent[] = [];
  let n = 0;
  const next = () => `oev-gen-${++n}`;

  for (const o of OBJECTIVES) {
    if (o.projectId === "proj-1") continue;

    // Creation. "suggested" objectives were never opened by a person, so
    // they are created straight into that status.
    const createdTo = o.status === "suggested" ? "suggested" : "open";
    const createdAt = o.startedAt ?? o.updatedAt;
    events.push({
      id: next(),
      objectiveId: o.id,
      at: createdAt,
      from: null,
      to: createdTo,
      actorId: null,
      note: null,
    });

    if (o.startedAt) {
      events.push({
        id: next(),
        objectiveId: o.id,
        at: o.startedAt,
        from: "open",
        to: "in_progress",
        actorId: null,
        note: null,
      });
    }
    if (o.status === "done" && o.completedAt) {
      events.push({
        id: next(),
        objectiveId: o.id,
        at: o.completedAt,
        from: o.startedAt ? "in_progress" : "open",
        to: "done",
        actorId: null,
        note: null,
      });
    }

    // The objective was touched after its last status change. Recorded as a
    // no-status-change event (the `from === to` convention) so the log's
    // final entry always lines up with `updatedAt` — otherwise a consumer
    // reading "last movement" off the log would report a date the objective
    // row itself contradicts.
    const lastAt = events[events.length - 1].at;
    if (o.updatedAt > lastAt) {
      events.push({
        id: next(),
        objectiveId: o.id,
        at: o.updatedAt,
        from: o.status,
        to: o.status,
        actorId: null,
        note: null,
      });
    }
  }
  return events;
}

export function getEventsByObjective(objectiveId: string): ObjectiveEvent[] {
  return OBJECTIVE_EVENTS.filter((e) => e.objectiveId === objectiveId).sort((a, b) =>
    a.at.localeCompare(b.at),
  );
}

export function getEventsByProject(projectId: string): ObjectiveEvent[] {
  const ids = new Set(OBJECTIVES.filter((o) => o.projectId === projectId).map((o) => o.id));
  return OBJECTIVE_EVENTS.filter((e) => ids.has(e.objectiveId)).sort((a, b) =>
    a.at.localeCompare(b.at),
  );
}
