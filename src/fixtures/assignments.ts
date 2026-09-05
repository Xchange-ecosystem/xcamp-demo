// P1.3 — Collaborator assignment feed + value wallet fixtures.
//
// Kept in a dedicated file rather than forcing the richer collaborator
// lifecycle into the generic FeedItem shape. Workflow state and value state
// are separate concepts: completing work and locking or settling its value
// do not necessarily happen at the same time.
//
// Built around Yuki Tanaka (person-9) — the collaborator fixture already
// used as the default/most-active assignee elsewhere (see
// src/routes/demo.founder.index.tsx's DEFAULT_ASSIGNEE_ID) — and cross-referenced
// against her existing rows in objectives.ts (TASKS) and wallet.ts
// (WALLET_ENTRIES) so all three fixture files agree: every "settled" amount
// and description below matches her wallet ledger exactly.
import { getObjectivesByProject } from "./objectives";

/** Where an assignment sits in the work lifecycle — distinct from
 *  `AssignmentValueState` below, which tracks whether its value has been
 *  formalized, not whether the work itself is done. */
export type AssignmentWorkflowState =
  | "awaiting-acceptance" // binding terms offered, not yet accepted
  | "needs-proof" // work underway, proof not yet attached
  | "delivered" // proof filed, awaiting certification
  | "in-progress" // terms accepted, work ongoing
  | "settled"; // objective certified, value released

/** The vocabulary rule for this screen (P1.3 brief): value that isn't yet
 *  locked is "informational" and part of a "sketch"; value that is locked
 *  reads as "committed under agreement"; settled value reads as "settled".
 *  Never "approved" / "confirmed" / "pending" as a value-state word. */
export type AssignmentValueState = "informational" | "committed" | "settled";

export interface Assignment {
  id: string;
  taskId: string; // Task.id — src/fixtures/objectives.ts
  objectiveId: string; // Objective.id
  projectId: string; // Project.id
  assigneeId: string; // Person.id — the collaborator this assignment belongs to
  ownerId: string; // Person.id — who offered the terms (the project founder)
  title: string;
  body: string;
  workflowState: AssignmentWorkflowState;
  valueState: AssignmentValueState;
  value: number; // credits
  dueLabel: string; // display copy, e.g. "due 10 Sep", "awaiting certification"
  /** Only present on `awaiting-acceptance` items — the terms shown in the
   *  review-terms dialog before counter-signing. */
  contract?: { role: string; share: string; terms: string };
}

// P1 demo persona — fixtures have no notion of "the logged-in collaborator",
// so this screen is built around one fixed fixture person, the same way
// FounderShell fixes on person-1 for the Founder screens.
export const DEMO_COLLABORATOR_ID = "person-9";

export const ASSIGNMENTS: Assignment[] = [
  {
    id: "asn-1",
    taskId: "task-2",
    objectiveId: "obj-1",
    projectId: "proj-1",
    assigneeId: "person-9",
    ownerId: "person-1",
    title: "Run thermal stress test on new enclosure",
    body: "I accepted binding terms on this task. Value is locked until the objective completes and is certified.",
    workflowState: "in-progress",
    valueState: "committed",
    value: 180,
    dueLabel: "due 10 Sep",
  },
  {
    id: "asn-2",
    taskId: "task-11",
    objectiveId: "obj-5",
    projectId: "proj-3",
    assigneeId: "person-9",
    ownerId: "person-2",
    title: "Fix ARM64 quantization regression",
    body: "Devon has offered binding terms on this task. Accepting locks my share of the value and counter-signs the agreement.",
    workflowState: "awaiting-acceptance",
    valueState: "informational",
    value: 220,
    dueLabel: "due 6 Sep",
    contract: {
      role: "Contributor",
      share: "220 cr of 640 cr pool",
      terms: "Objective agreement v1",
    },
  },
  {
    id: "asn-3",
    taskId: "task-9",
    objectiveId: "obj-5",
    projectId: "proj-3",
    assigneeId: "person-9",
    ownerId: "person-2",
    title: "Ship RISC-V backend",
    body: "Proof filed and delivered. Waiting on certification before this value releases.",
    workflowState: "delivered",
    valueState: "committed",
    value: 150,
    dueLabel: "awaiting certification",
  },
  {
    id: "asn-4",
    taskId: "task-7",
    objectiveId: "obj-3",
    projectId: "proj-2",
    assigneeId: "person-9",
    ownerId: "person-1",
    title: "Respond to UL lab follow-up questions",
    body: "Still a sketch — no agreement offered yet, so nothing here is binding on me. Proof needs to be attached before it counts.",
    workflowState: "needs-proof",
    valueState: "informational",
    value: 90,
    dueLabel: "due 5 Sep",
  },
  {
    id: "asn-5",
    taskId: "task-18",
    objectiveId: "obj-10",
    projectId: "proj-5",
    assigneeId: "person-9",
    ownerId: "person-3",
    title: "Tune nudge model on pilot cohort data",
    body: "Still a sketch. Delivered work needs proof attached before it counts.",
    workflowState: "needs-proof",
    valueState: "informational",
    value: 130,
    dueLabel: "due 13 Sep",
  },
  {
    id: "asn-6",
    taskId: "task-1",
    objectiveId: "obj-1",
    projectId: "proj-1",
    assigneeId: "person-9",
    ownerId: "person-1",
    title: "Finalize BOM for v2 controller board",
    body: "Objective certified. Value released to my wallet.",
    workflowState: "settled",
    valueState: "settled",
    value: 180,
    dueLabel: "settled 20 Aug",
  },
  {
    id: "asn-7",
    taskId: "task-6",
    objectiveId: "obj-3",
    projectId: "proj-2",
    assigneeId: "person-9",
    ownerId: "person-1",
    title: "Submit UL 1974 test samples",
    body: "Objective certified. Value released to my wallet.",
    workflowState: "settled",
    valueState: "settled",
    value: 140,
    dueLabel: "settled 10 Aug",
  },
  {
    id: "asn-8",
    taskId: "task-23",
    objectiveId: "obj-13",
    projectId: "proj-7",
    assigneeId: "person-9",
    ownerId: "person-4",
    title: "Calibrate inspection cameras for salt spray",
    body: "Objective certified. Value released to my wallet.",
    workflowState: "settled",
    valueState: "settled",
    value: 160,
    dueLabel: "settled 8 Aug",
  },
];

export function getAssignmentsByAssignee(assigneeId: string): Assignment[] {
  return ASSIGNMENTS.filter((a) => a.assigneeId === assigneeId);
}

/** Objective title for an assignment's crumb — falls back to the id if the
 *  objective was ever removed from objectives.ts, so a stale reference
 *  degrades instead of crashing the feed. */
export function getAssignmentObjectiveTitle(a: Assignment): string {
  const objective = getObjectivesByProject(a.projectId).find((o) => o.id === a.objectiveId);
  return objective?.title ?? a.objectiveId;
}
