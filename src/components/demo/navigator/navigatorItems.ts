// src/components/demo/navigator/navigatorItems.ts
//
// Shared data layer for the Founder Navigator's four sub-views (Board /
// List / Network / Timeline) — every view draws from the same
// Objective+Task item set for Solari Energy (DEMO_FOUNDER_PROJECT_ID), per
// the session brief's scoping decision (see route files for the flagged
// rationale). No Supabase, no new fixture rows.
//
// These functions take live, already project-scoped objectives/tasks as
// params (see useDemoObjectivesByProject/useDemoTasksByProject in
// demoItemsStore.ts) rather than reading the static OBJECTIVES/TASKS
// fixture arrays directly — a status change or subtask completion made via
// the sidepanel/fullscreen task view writes to that store, and previously
// none of these four views ever reflected it since they bypassed the store
// entirely. DemoObjectiveState/DemoTaskState are supersets of
// Objective/Task (every original field plus the demo-only ones), so they
// satisfy these functions' existing Objective/Task-shaped signatures as-is.
import { getPersonById } from "@/fixtures/people";
import { getProjectById } from "@/fixtures/projects";
import { DEMO_FOUNDER_PROJECT_ID } from "@/fixtures/pitch";
import type { Objective, ObjectiveDimension, Task } from "@/fixtures/types";

export type NavigatorItemType = "objective" | "task";

export interface NavigatorItem {
  id: string;
  type: NavigatorItemType;
  title: string;
  /** Display label for the item's lifecycle state — Objective's
   *  open/in_progress/done/suggested or Task's inactive/active/completed,
   *  title-cased for direct display (List/Network/Timeline all show this
   *  string as-is, no further relabeling). */
  status: string;
  statusRaw: Objective["status"] | Task["status"];
  ownerName: string | null;
  dueDate: string | null;
  objectiveId: string | null; // set on tasks; null on objectives
  dimension: ObjectiveDimension | null; // set on objectives only
}

const OBJECTIVE_STATUS_LABEL: Record<Objective["status"], string> = {
  open: "Open",
  in_progress: "In progress",
  done: "Done",
  suggested: "Suggested",
};

const TASK_STATUS_LABEL: Record<Task["status"], string> = {
  inactive: "Still a sketch",
  active: "Active",
  completed: "Complete",
};

function objectiveOwnerName(): string | null {
  const project = getProjectById(DEMO_FOUNDER_PROJECT_ID);
  const owner = project ? getPersonById(project.ownerId) : undefined;
  return owner?.displayName ?? null;
}

function toObjectiveItem(o: Objective, ownerName: string | null): NavigatorItem {
  return {
    id: o.id,
    type: "objective",
    title: o.title,
    status: OBJECTIVE_STATUS_LABEL[o.status],
    statusRaw: o.status,
    ownerName,
    dueDate: null,
    objectiveId: null,
    dimension: o.dimension,
  };
}

function toTaskItem(t: Task): NavigatorItem {
  const assignee = t.assigneeId ? getPersonById(t.assigneeId) : undefined;
  return {
    id: t.id,
    type: "task",
    title: t.title,
    status: TASK_STATUS_LABEL[t.status],
    statusRaw: t.status,
    // Tasks with no assignee fall back to the project owner — a task always
    // has *someone* accountable for it in this demo's narrative, and the
    // owner is the only real candidate the fixtures support for an
    // unassigned task (no "unowned" concept modeled elsewhere in this repo).
    ownerName: assignee?.displayName ?? objectiveOwnerName(),
    dueDate: t.dueDate,
    objectiveId: t.objectiveId,
    dimension: null,
  };
}

/** Objectives, as NavigatorItems (Board's item set). */
export function getNavigatorObjectiveItems(objectives: Objective[]): NavigatorItem[] {
  const ownerName = objectiveOwnerName();
  return objectives.map((o) => toObjectiveItem(o, ownerName));
}

/** Tasks, as NavigatorItems. */
export function getNavigatorTaskItems(tasks: Task[]): NavigatorItem[] {
  return tasks.map(toTaskItem);
}

/** Objectives + Tasks together (List/Network/Timeline's shared item set). */
export function getNavigatorItems(objectives: Objective[], tasks: Task[]): NavigatorItem[] {
  return [...getNavigatorObjectiveItems(objectives), ...getNavigatorTaskItems(tasks)];
}

export function getNavigatorTasksForObjective(objectiveId: string, tasks: Task[]): NavigatorItem[] {
  return tasks.filter((t) => t.objectiveId === objectiveId).map(toTaskItem);
}

/* ── Deterministic task start dates (Timeline only) ──────────────────────
 *
 * Task carries a real dueDate but no startDate — nothing in this demo's
 * fixture layer models a task's start. Rather than invent one via any
 * generative process, this derives it deterministically from the task's
 * real dueDate and priority (a plain authored duration per priority level,
 * same "computed from real values" idiom as deriveChatSideEffects.ts /
 * deriveTaskProgressTimeline.ts) — not stored back on the fixture, just
 * computed where the Timeline view needs a date range to place a bar.
 */
const DURATION_DAYS_BY_PRIORITY: Record<Task["priority"], number> = {
  high: 5,
  medium: 8,
  low: 12,
};

const DAY_MS = 86_400_000;

export function deriveTaskDateRange(task: Task): { start: string; end: string } | null {
  if (!task.dueDate) return null;
  const due = new Date(`${task.dueDate}T00:00:00Z`);
  const durationDays = DURATION_DAYS_BY_PRIORITY[task.priority];
  const start = new Date(due.getTime() - durationDays * DAY_MS);
  return { start: start.toISOString().slice(0, 10), end: task.dueDate };
}
