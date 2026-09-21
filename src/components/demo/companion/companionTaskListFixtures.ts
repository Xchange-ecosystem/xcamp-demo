// src/components/demo/companion/companionTaskListFixtures.ts
//
// Display-only status lane for the Companion Items tab's "All tasks" list
// (src/components/demo/companion/CompanionInfoPanel.tsx's AllTasksListView).
// The real fixtures/objectives.ts Task.status is "inactive" | "active" |
// "completed" — a different, narrower vocabulary already relied on
// elsewhere (demoItemsStore, ItemSidepanel, founder/RightColumn). Rather
// than widen that shared type for one list's filter pills, this file keeps
// a separate id -> lifecycle-status lookup scoped to this feature only.
// Every task-30..task-49 fixture (src/fixtures/objectives.ts) has an entry
// here; any task id without one (e.g. the pre-existing task-1..task-29 rows
// that also surface in "Worth your attention") falls back to "active" so it
// never spuriously qualifies for the Dismiss button below.
export type CompanionTaskLifecycleStatus = "suggested" | "open" | "active" | "confirmed";

export const COMPANION_TASK_LIFECYCLE_STATUS: Record<string, CompanionTaskLifecycleStatus> = {
  "task-30": "suggested",
  "task-31": "open",
  "task-32": "suggested",
  "task-33": "open",
  "task-34": "active",
  "task-35": "active",
  "task-36": "suggested",
  "task-37": "open",
  "task-38": "suggested",
  "task-39": "active",
  "task-40": "confirmed",
  "task-41": "open",
  "task-42": "confirmed",
  "task-43": "active",
  "task-44": "suggested",
  "task-45": "active",
  "task-46": "open",
  "task-47": "confirmed",
  "task-48": "suggested",
  "task-49": "active",
};

export function getCompanionTaskLifecycleStatus(taskId: string): CompanionTaskLifecycleStatus {
  return COMPANION_TASK_LIFECYCLE_STATUS[taskId] ?? "active";
}

export const COMPANION_ALL_TASKS_IDS: string[] = Array.from(
  { length: 20 },
  (_, i) => `task-${30 + i}`,
);

export const COMPANION_TASK_STATUS_FILTERS: { key: CompanionTaskLifecycleStatus; label: string }[] =
  [
    { key: "suggested", label: "Suggested" },
    { key: "open", label: "Open" },
    { key: "active", label: "Active" },
    { key: "confirmed", label: "Confirmed" },
  ];
