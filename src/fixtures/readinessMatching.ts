// src/fixtures/readinessMatching.ts
//
// Static seed data for the Readiness "matching review" screen
// (demo.founder.microapps.readiness.tsx) — Solari Energy (DEMO_FOUNDER_PROJECT_ID)
// only. Every confirmed/pending match below references a real id from
// src/fixtures/objectives.ts (OBJECTIVES/TASKS), a real Project.tags entry,
// or a real ObjectiveDimension value — nothing invented. See
// src/store/readinessMatchingStore.ts for the mutable (accept/reject) layer
// seeded from this file, mirroring demoItemsStore.ts's fixture-forked,
// local-state-only pattern.
//
// Type note: the design spec's source-type list included "Category" — Phase
// 0 found no "category" concept anywhere in this repo's fixture data
// (Project has `tags`, Objective has `dimension`; neither is called
// "category"), so it's omitted from MatchSourceType below rather than
// invented.
export type MatchSourceType = "objective" | "task" | "dimension" | "tag";

export interface ReadinessMatch {
  id: string;
  sourceType: MatchSourceType;
  /** Real id into OBJECTIVES/TASKS for objective/task types; the literal
   *  dimension or tag value itself for dimension/tag types. */
  sourceId: string;
  title: string;
  confidence: number; // 0-100
}

export interface ReadinessSuggestion extends ReadinessMatch {
  criterionId: string;
  rationale: string;
}

export interface ReadinessCriterion {
  id: string;
  name: string;
  projectId: string;
  confirmed: ReadinessMatch[];
}

export const READINESS_TEMPLATE_NAME = "Seed investment readiness";

export const READINESS_CRITERIA: ReadinessCriterion[] = [
  {
    id: "market",
    name: "Market validation",
    projectId: "proj-1",
    confirmed: [
      {
        id: "m-obj-2",
        sourceType: "objective",
        sourceId: "obj-2",
        title: "Close pilot with Kenya Power",
        confidence: 88,
      },
      {
        id: "m-obj-17",
        sourceType: "objective",
        sourceId: "obj-17",
        title: "Validate demand across three rural counties",
        confidence: 81,
      },
    ],
  },
  {
    id: "team",
    name: "Team completeness",
    projectId: "proj-1",
    confirmed: [],
  },
  {
    id: "unit",
    name: "Unit economics",
    projectId: "proj-1",
    confirmed: [
      {
        id: "m-obj-19",
        sourceType: "objective",
        sourceId: "obj-19",
        title: "Model unit economics at 500-site scale",
        confidence: 92,
      },
    ],
  },
  {
    id: "reg",
    name: "Regulatory readiness",
    projectId: "proj-1",
    confirmed: [
      {
        id: "m-obj-21",
        sourceType: "objective",
        sourceId: "obj-21",
        title: "Secure ISO 9001 manufacturing partner",
        confidence: 64,
      },
    ],
  },
  {
    id: "traction",
    name: "Traction & pilots",
    projectId: "proj-1",
    confirmed: [
      {
        id: "m-task-4",
        sourceType: "task",
        sourceId: "task-4",
        title: "Prepare pilot proposal deck",
        confidence: 77,
      },
      {
        id: "m-task-5",
        sourceType: "task",
        sourceId: "task-5",
        title: "Schedule site visit with Kenya Power",
        confidence: 71,
      },
    ],
  },
  {
    id: "docs",
    name: "Documentation quality",
    projectId: "proj-1",
    confirmed: [],
  },
];

export const READINESS_SUGGESTIONS: ReadinessSuggestion[] = [
  {
    id: "s-obj-20",
    criterionId: "market",
    sourceType: "objective",
    sourceId: "obj-20",
    title: "Map the operator procurement path",
    confidence: 62,
    rationale:
      "Shares the Market dimension with two already-confirmed objectives and references the same Kenya Power procurement track — pending manual confirmation.",
  },
  {
    id: "s-dim-market",
    criterionId: "market",
    sourceType: "dimension",
    sourceId: "Market",
    title: "Market",
    confidence: 58,
    rationale:
      "The Market dimension itself, aggregated across all of Solari Energy's Market-tagged objectives — a coarse signal pending review against the individual objective-level matches already confirmed.",
  },
  {
    id: "s-tag-climate",
    criterionId: "market",
    sourceType: "tag",
    sourceId: "climate",
    title: "climate",
    confidence: 50,
    rationale:
      "Project tagged \"climate\" — climate-motivated rural demand is part of this project's market thesis, but the tag alone doesn't specify which market signal it supports.",
  },
  {
    id: "s-obj-22",
    criterionId: "team",
    sourceType: "objective",
    sourceId: "obj-22",
    title: "Contribution and evaluation record",
    confidence: 45,
    rationale:
      "Only objective carrying the Team dimension — surfaced as a candidate, but its content is about collaborator evaluation, not hiring or team completeness directly.",
  },
  {
    id: "s-obj-24",
    criterionId: "unit",
    sourceType: "objective",
    sourceId: "obj-24",
    title: "Define the 18-month capital requirement",
    confidence: 55,
    rationale:
      "Shares the Business dimension with the confirmed unit-economics objective; capital planning is adjacent to, but not itself, a unit-economics model.",
  },
];
