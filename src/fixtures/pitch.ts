// Pitch card fixtures — Solari Energy (proj-1) only. Body copy is taken
// verbatim from docs/mockups/pitch-solari-mockup.html's CARDS array; it is
// the design, not a draft. Source rows reference real Objective ids from
// src/fixtures/objectives.ts (obj-1, obj-2, and the obj-17..22 set added
// this session) rather than duplicating objective titles/metadata as
// strings, so the evidence rail always reads through to the live fixture.
//
// No production analog exists for "a composed pitch card" yet — this whole
// file is P1-only, same disclaimer as portfolio.ts/wallet.ts.

// Pitch reads only this one project this session (Solari Energy) — same
// single-subject pattern as assignments.ts's DEMO_COLLABORATOR_ID.
export const DEMO_FOUNDER_PROJECT_ID = "proj-1";

export type PitchCardState = "fresh" | "stale" | "empty";

export interface PitchBodyParagraph {
  text: string;
  /** 1-based index into this card's `sources` array — matches the inline
   *  citation marker shown after this paragraph in the composed prose. */
  sourceIndex: number;
}

export interface PitchSource {
  objectiveId: string;
  /** This evidence row is one of the sources that moved since the card was
   *  composed — only meaningful when the card's `state` is "stale". A
   *  property of this card's staleness, not of the objective itself. */
  warm?: boolean;
}

export interface PitchCard {
  id: string;
  name: string;
  state: PitchCardState;
  /** Verbatim relative-time label from the design (e.g. "2 days ago").
   *  Null for empty cards, which have never been composed. */
  composedAt: string | null;
  /** Composed prose. Empty for empty cards. */
  body: PitchBodyParagraph[];
  /** Evidence rail rows, in citation order. Empty for empty cards. */
  sources: PitchSource[];
  /** Empty cards only: the objective titles that would unlock this card. */
  unlocksFrom: string[];
}

export const PITCH_CARDS: PitchCard[] = [
  {
    id: "problem",
    name: "Problem",
    state: "fresh",
    composedAt: "2 days ago",
    body: [
      {
        text: "Six hundred million people across sub-Saharan Africa have no grid connection, and extending national transmission to reach them costs more per household than those households will spend on electricity in a decade.",
        sourceIndex: 1,
      },
      {
        text: "We surveyed 340 households across three Kenyan counties and found willingness to pay is not the constraint — 71% already spend more on kerosene and phone charging than a microgrid tariff would cost them.",
        sourceIndex: 1,
      },
      {
        text: "The constraint is capital structure. Existing microgrid hardware is priced for donor-funded pilots, not for operators who need the unit to pay back inside four years.",
        sourceIndex: 2,
      },
    ],
    sources: [{ objectiveId: "obj-17" }, { objectiveId: "obj-19" }],
    unlocksFrom: [],
  },
  {
    id: "opportunity",
    name: "Opportunity",
    state: "fresh",
    composedAt: "2 days ago",
    body: [
      {
        text: "A modular controller that ships at $180 rather than $260 moves the payback period from six years to under four, which is the threshold at which commercial operators — not just donors — will fund deployment.",
        sourceIndex: 1,
      },
      {
        text: "We have run twelve sites for nine months to prove the hardware survives the environment before we argue about the economics.",
        sourceIndex: 2,
      },
    ],
    sources: [{ objectiveId: "obj-19" }, { objectiveId: "obj-18" }],
    unlocksFrom: [],
  },
  {
    id: "market",
    name: "Market",
    state: "fresh",
    composedAt: "5 days ago",
    body: [
      {
        text: "We sell to microgrid operators and utilities running rural electrification mandates, not to households. In Kenya alone that is fourteen licensed operators plus Kenya Power itself.",
        sourceIndex: 1,
      },
      {
        text: "The buyer is the operations lead who owns uptime, not the sustainability office. That changed how we price service contracts.",
        sourceIndex: 2,
      },
    ],
    sources: [{ objectiveId: "obj-17" }, { objectiveId: "obj-20" }],
    unlocksFrom: [],
  },
  {
    id: "product",
    name: "Product",
    state: "fresh",
    composedAt: "6 days ago",
    body: [
      {
        text: "A modular controller, a standard rack of panels the operator sources locally, and a remote management layer. We build the controller and the software; we deliberately do not touch generation or distribution hardware.",
        sourceIndex: 1,
      },
      {
        text: "The v2 board is in redesign now, targeting a 30% unit-cost reduction against the deployed v1.",
        sourceIndex: 2,
      },
    ],
    sources: [{ objectiveId: "obj-18" }, { objectiveId: "obj-1" }],
    unlocksFrom: [],
  },
  {
    id: "traction",
    name: "Traction",
    state: "stale",
    composedAt: "3 weeks ago",
    body: [
      {
        text: "Twelve sites live for nine months with 99.1% controller uptime across the deployment.",
        sourceIndex: 1,
      },
      {
        text: "A 50-site pilot agreement with Kenya Power is in negotiation, with the site visit scheduled and the proposal deck in preparation.",
        sourceIndex: 2,
      },
    ],
    sources: [
      { objectiveId: "obj-18", warm: true },
      { objectiveId: "obj-2", warm: true },
    ],
    unlocksFrom: [],
  },
  {
    id: "team",
    name: "Team",
    state: "fresh",
    composedAt: "6 days ago",
    body: [
      {
        text: "Maren Solberg founded Solari after seven years building grid infrastructure in Norway and East Africa. The team is four people plus a standing bench of contributors.",
        sourceIndex: 1,
      },
      {
        text: "Eleven collaborators have filed evaluated work against this project, averaging 84% on assessment.",
        sourceIndex: 2,
      },
    ],
    sources: [{ objectiveId: "obj-21" }, { objectiveId: "obj-22" }],
    unlocksFrom: [],
  },
  {
    id: "model",
    name: "Business model",
    state: "empty",
    composedAt: null,
    body: [],
    sources: [],
    unlocksFrom: ["Price the operator service contract", "Model gross margin at pilot volume"],
  },
  {
    id: "ask",
    name: "The ask",
    state: "empty",
    composedAt: null,
    body: [],
    sources: [],
    unlocksFrom: ["Define the 18-month capital requirement"],
  },
];

export function getPitchCardById(id: string): PitchCard | undefined {
  return PITCH_CARDS.find((c) => c.id === id);
}
