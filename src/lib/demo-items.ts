// Demo item id helpers — the signal used to branch shared components
// (ItemSidepanel's ObjectiveContent/NoteContent/LinkedItemsTab, AboutTab,
// DoDocumentTab) between their real Supabase-backed path and the
// fixture/local-state-backed demo path. Fixture ids ("obj-1", "task-4", see
// src/fixtures/objectives.ts) never collide with real Supabase uuids, so this
// needs no route/context plumbing — a real id passed through these checks
// always resolves to `false` and the real code path runs completely
// unchanged.
const DEMO_OBJECTIVE_ID_RE = /^obj-\d+$/;
const DEMO_TASK_ID_RE = /^task-\d+$/;

export function isDemoObjectiveId(id: string): boolean {
  return DEMO_OBJECTIVE_ID_RE.test(id);
}

export function isDemoTaskId(id: string): boolean {
  return DEMO_TASK_ID_RE.test(id);
}

export function isDemoItemId(id: string): boolean {
  return isDemoObjectiveId(id) || isDemoTaskId(id);
}
