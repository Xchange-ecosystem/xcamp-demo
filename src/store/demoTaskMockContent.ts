// src/store/demoTaskMockContent.ts
//
// Deterministic per-task mock content for the task detail views (full-page
// TaskDetailShell and the slide-in ItemSidepanel) — subtasks, collaborators,
// artifacts, and agent actions. Computed once, here, from a task's own id
// (a stable hash, not Math.random) and folded into demoItemsStore's seedTasks()
// at store-creation time. Every view that opens a given task — Companion's
// right panel, the Platform altitude, any persona, the slide-in panel or the
// full-page shell — reads the *same* zustand store instance keyed by task id,
// so this is the one place task-detail mock content is authored; nothing
// downstream regenerates or forks it per-render or per-component. See CC
// brief Scope E3 ("shared fixture, not per-view").
import type { Objective, Person, Task } from "@/fixtures/types";
import { PEOPLE } from "@/fixtures/people";

export interface DemoSubtaskSeed {
  id: string;
  title: string;
  done: boolean;
}

export type CollaboratorStatus = "invited" | "active" | "confirmed";

export interface DemoCollaborator {
  id: string;
  personId: string;
  role: string;
  remuneration: string;
  valueXcoins: number;
  maxHours: number;
  status: CollaboratorStatus;
}

export interface DemoTaskArtifact {
  id: string;
  title: string;
  typeLabel: string;
  updatedLabel: string;
}

export interface DemoTaskAgentAction {
  id: string;
  title: string;
  rationale: string;
  state: "suggested" | "completed";
}

export interface DemoTaskMockContent {
  subtasks: DemoSubtaskSeed[];
  collaborators: DemoCollaborator[];
  artifacts: DemoTaskArtifact[];
  agentActions: DemoTaskAgentAction[];
}

// Small stable string hash (FNV-1a) -> mulberry32 PRNG. Not cryptographic,
// just needs to be the same integer every run for the same task id so the
// "random-looking" picks below are actually fixed per task, forever.
function hashString(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickN<T>(pool: T[], n: number, rand: () => number): T[] {
  const shuffled = [...pool];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, Math.min(n, shuffled.length));
}

const SUBTASK_TITLE_POOL = [
  "Draft outline and share for feedback",
  "Confirm scope with stakeholders",
  "Collect supporting data/screenshots",
  "Write first draft",
  "Get a second pair of eyes on it",
  "Send for review",
  "Incorporate review feedback",
  "Schedule the follow-up call",
  "Update the tracker with progress",
  "Close out loose ends",
  "Double-check numbers against source",
  "Prep talking points",
];

const ROLE_POOL = ["Contributor", "Reviewer", "Domain expert", "Coordinator", "Advisor"];
const REMUNERATION_POOL = ["Fixed", "Hourly", "Equity-like"];
const COLLAB_STATUS_POOL: CollaboratorStatus[] = ["invited", "active", "confirmed"];

const ARTIFACT_TEMPLATES: { typeLabel: string; titleTemplate: string; updatedLabel: string }[] = [
  {
    typeLabel: "Document",
    titleTemplate: "Draft report — {title}",
    updatedLabel: "Updated 2 days ago",
  },
  {
    typeLabel: "Note",
    titleTemplate: "Working notes — {title}",
    updatedLabel: "Updated 4 days ago",
  },
  {
    typeLabel: "Deck",
    titleTemplate: "Summary slide — {title}",
    updatedLabel: "Updated last week",
  },
];

const AGENT_ACTION_TEMPLATES: {
  titleTemplate: string;
  rationale: string;
  state: "suggested" | "completed";
}[] = [
  {
    titleTemplate: 'Draft a status update for "{title}"',
    rationale: "No update posted on this task in over a week.",
    state: "suggested",
  },
  {
    titleTemplate: 'Suggest a collaborator for "{title}"',
    rationale: "This task type has historically moved faster with a second contributor.",
    state: "suggested",
  },
  {
    titleTemplate: 'Summarized recent activity on "{title}"',
    rationale: "Compiled the latest notes and attachments into one summary.",
    state: "completed",
  },
];

/** Deterministic mock content for one task, keyed by its own id. Same input,
 *  same output, every call — computed once at store seed time. */
export function buildMockTaskContent(taskId: string, taskTitle: string): DemoTaskMockContent {
  const rand = mulberry32(hashString(taskId));

  const subtaskCount = 3 + Math.floor(rand() * 3); // 3-5
  const subtaskTitles = pickN(SUBTASK_TITLE_POOL, subtaskCount, rand);
  const subtasks: DemoSubtaskSeed[] = subtaskTitles.map((title, i) => ({
    id: `${taskId}-subtask-${i}`,
    title,
    // Roughly the first half done, matching "mix of checked/unchecked".
    done: rand() < 0.45,
  }));

  const collaboratorCount = 2 + Math.floor(rand() * 3); // 2-4
  const people = pickN(PEOPLE, collaboratorCount, rand);
  const collaborators: DemoCollaborator[] = people.map((person: Person, i: number) => ({
    id: `${taskId}-collab-${i}`,
    personId: person.id,
    role: ROLE_POOL[Math.floor(rand() * ROLE_POOL.length)],
    remuneration: REMUNERATION_POOL[Math.floor(rand() * REMUNERATION_POOL.length)],
    valueXcoins: 50 * (2 + Math.floor(rand() * 18)), // 100-950, steps of 50
    maxHours: 2 + Math.floor(rand() * 14), // 2-15
    status: COLLAB_STATUS_POOL[Math.floor(rand() * COLLAB_STATUS_POOL.length)],
  }));

  const artifactCount = 1 + Math.floor(rand() * 2); // 1-2
  const artifactTemplates = pickN(ARTIFACT_TEMPLATES, artifactCount, rand);
  const artifacts: DemoTaskArtifact[] = artifactTemplates.map((tpl, i) => ({
    id: `${taskId}-artifact-${i}`,
    title: tpl.titleTemplate.replace("{title}", taskTitle),
    typeLabel: tpl.typeLabel,
    updatedLabel: tpl.updatedLabel,
  }));

  const actionCount = 1 + Math.floor(rand() * 2); // 1-2
  const actionTemplates = pickN(AGENT_ACTION_TEMPLATES, actionCount, rand);
  const agentActions: DemoTaskAgentAction[] = actionTemplates.map((tpl, i) => ({
    id: `${taskId}-action-${i}`,
    title: tpl.titleTemplate.replace("{title}", taskTitle),
    rationale: tpl.rationale,
    state: tpl.state,
  }));

  return { subtasks, collaborators, artifacts, agentActions };
}

/** Extra linked-item ids for a task's Linked Items tab, beyond its default
 *  parent objective — 1-2 sibling objectives and 1-2 sibling tasks from the
 *  same project, deterministically picked so "mixed types" (Objective +
 *  Task) shows up without hand-authoring a per-task list. Same seeding
 *  approach as buildMockTaskContent — same task id, same picks, always. */
export function pickExtraLinkedIds(
  task: Task,
  allObjectives: Objective[],
  allTasks: Task[],
): { extraObjectiveIds: string[]; extraTaskIds: string[] } {
  const rand = mulberry32(hashString(`${task.id}-links`));

  const objectivePool = allObjectives
    .filter((o) => o.projectId === task.projectId && o.id !== task.objectiveId)
    .map((o) => o.id);
  const taskPool = allTasks
    .filter((t) => t.projectId === task.projectId && t.id !== task.id)
    .map((t) => t.id);

  const extraObjectiveIds = pickN(objectivePool, 1 + Math.floor(rand() * 2), rand);
  const extraTaskIds = pickN(taskPool, 1 + Math.floor(rand() * 2), rand);

  return { extraObjectiveIds, extraTaskIds };
}
