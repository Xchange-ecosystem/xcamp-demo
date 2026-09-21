import { useMemo } from "react";
import { create } from "zustand";
import { OBJECTIVES, TASKS, getTasksByObjective } from "@/fixtures/objectives";
import type { Objective, Task } from "@/fixtures/types";
import type { NoteAttachment } from "@/types/xcamp";
import {
  buildMockTaskContent,
  pickExtraLinkedIds,
  type DemoCollaborator,
  type DemoTaskAgentAction,
  type DemoTaskArtifact,
} from "@/store/demoTaskMockContent";

// In-memory, session-local store backing the B1 sidepanel + fullscreen demo.
// Every write action from ItemSidepanel's demo fork and the fullscreen demo
// tabs lands here instead of Supabase — nothing here ever calls `supabase`,
// `voxFetch`, or any `*-api.ts` module. Seeded once from the existing
// OBJECTIVES/TASKS fixtures (src/fixtures/objectives.ts) and extended with
// the fields the real sidepanel/fullscreen components render that those
// fixtures didn't previously carry (tags, attachments, body, subtasks,
// timeframe, ad-hoc links). State resets on page reload — there is no
// persistence requirement here, matching "no presenter change needs to
// persist".

export interface DemoSubtask {
  id: string;
  title: string;
  done: boolean;
}

export interface DemoObjectiveState extends Objective {
  tags: string[];
  attachments: NoteAttachment[];
  /** Ids of demo tasks linked beyond the default objectiveId relationship. */
  extraLinkedTaskIds: string[];
  /** Ids of demo tasks removed from the Linked Items list (default or extra). */
  removedLinkedTaskIds: string[];
  deleted: boolean;
}

export interface DemoTaskState extends Task {
  bodyHtml: string;
  tags: string[];
  attachments: NoteAttachment[];
  startDate: string | null;
  endDate: string | null;
  subtasks: DemoSubtask[];
  /** Ids of demo objectives linked beyond the task's own objectiveId. */
  extraLinkedObjectiveIds: string[];
  /** Ids of demo objectives removed from the Linked Items list (default or extra). */
  removedLinkedObjectiveIds: string[];
  /** Ids of demo tasks linked to this one (tasks have no default task-link,
   *  unlike the objective relationship above — every entry here is "extra"). */
  extraLinkedTaskIds: string[];
  /** Ids of linked-task entries removed from the Linked Items list. */
  removedLinkedTaskIds: string[];
  /** Task-scoped mock content for Match & Collaborate / Actions & Artifacts —
   *  see demoTaskMockContent.ts for how these are seeded (deterministic,
   *  keyed by task id, computed once here). */
  collaborators: DemoCollaborator[];
  artifacts: DemoTaskArtifact[];
  agentActions: DemoTaskAgentAction[];
  deleted: boolean;
}

function seedObjectives(): Record<string, DemoObjectiveState> {
  return Object.fromEntries(
    OBJECTIVES.map((o) => [
      o.id,
      {
        ...o,
        tags: [],
        attachments: [],
        extraLinkedTaskIds: [],
        removedLinkedTaskIds: [],
        deleted: false,
      },
    ]),
  );
}

function seedTasks(): Record<string, DemoTaskState> {
  return Object.fromEntries(
    TASKS.map((t) => {
      const mock = buildMockTaskContent(t.id, t.title);
      const { extraObjectiveIds, extraTaskIds } = pickExtraLinkedIds(t, OBJECTIVES, TASKS);
      return [
        t.id,
        {
          ...t,
          bodyHtml: `<p>${t.title}.</p>`,
          tags: [],
          attachments: [],
          startDate: null,
          endDate: null,
          subtasks: mock.subtasks,
          extraLinkedObjectiveIds: extraObjectiveIds,
          removedLinkedObjectiveIds: [],
          extraLinkedTaskIds: extraTaskIds,
          removedLinkedTaskIds: [],
          collaborators: mock.collaborators,
          artifacts: mock.artifacts,
          agentActions: mock.agentActions,
          deleted: false,
        },
      ];
    }),
  );
}

interface DemoItemsStore {
  objectives: Record<string, DemoObjectiveState>;
  tasks: Record<string, DemoTaskState>;

  updateObjective: (id: string, patch: Partial<DemoObjectiveState>) => void;
  deleteObjective: (id: string) => void;

  updateTask: (id: string, patch: Partial<DemoTaskState>) => void;
  deleteTask: (id: string) => void;
  toggleTaskDone: (id: string) => void;

  addSubtask: (taskId: string, title: string) => void;
  toggleSubtask: (taskId: string, subtaskId: string) => void;
  removeSubtask: (taskId: string, subtaskId: string) => void;

  linkObjectiveTask: (objectiveId: string, taskId: string) => void;
  unlinkObjectiveTask: (objectiveId: string, taskId: string) => void;

  linkTaskTask: (taskId: string, otherTaskId: string) => void;
  unlinkTaskTask: (taskId: string, otherTaskId: string) => void;
}

export const useDemoItemsStore = create<DemoItemsStore>()((set) => ({
  objectives: seedObjectives(),
  tasks: seedTasks(),

  updateObjective: (id, patch) =>
    set((s) => {
      const current = s.objectives[id];
      if (!current) return s;
      return { objectives: { ...s.objectives, [id]: { ...current, ...patch } } };
    }),

  deleteObjective: (id) =>
    set((s) => {
      const current = s.objectives[id];
      if (!current) return s;
      return { objectives: { ...s.objectives, [id]: { ...current, deleted: true } } };
    }),

  updateTask: (id, patch) =>
    set((s) => {
      const current = s.tasks[id];
      if (!current) return s;
      return { tasks: { ...s.tasks, [id]: { ...current, ...patch } } };
    }),

  deleteTask: (id) =>
    set((s) => {
      const current = s.tasks[id];
      if (!current) return s;
      return { tasks: { ...s.tasks, [id]: { ...current, deleted: true } } };
    }),

  toggleTaskDone: (id) =>
    set((s) => {
      const current = s.tasks[id];
      if (!current) return s;
      const done = !current.done;
      return {
        tasks: {
          ...s.tasks,
          [id]: { ...current, done, status: done ? "completed" : "active" },
        },
      };
    }),

  addSubtask: (taskId, title) =>
    set((s) => {
      const current = s.tasks[taskId];
      if (!current) return s;
      const subtask: DemoSubtask = { id: crypto.randomUUID(), title, done: false };
      return {
        tasks: { ...s.tasks, [taskId]: { ...current, subtasks: [...current.subtasks, subtask] } },
      };
    }),

  toggleSubtask: (taskId, subtaskId) =>
    set((s) => {
      const current = s.tasks[taskId];
      if (!current) return s;
      return {
        tasks: {
          ...s.tasks,
          [taskId]: {
            ...current,
            subtasks: current.subtasks.map((st) =>
              st.id === subtaskId ? { ...st, done: !st.done } : st,
            ),
          },
        },
      };
    }),

  removeSubtask: (taskId, subtaskId) =>
    set((s) => {
      const current = s.tasks[taskId];
      if (!current) return s;
      return {
        tasks: {
          ...s.tasks,
          [taskId]: {
            ...current,
            subtasks: current.subtasks.filter((st) => st.id !== subtaskId),
          },
        },
      };
    }),

  linkObjectiveTask: (objectiveId, taskId) =>
    set((s) => {
      const obj = s.objectives[objectiveId];
      const task = s.tasks[taskId];
      if (!obj || !task) return s;
      return {
        objectives: {
          ...s.objectives,
          [objectiveId]: {
            ...obj,
            extraLinkedTaskIds: obj.extraLinkedTaskIds.includes(taskId)
              ? obj.extraLinkedTaskIds
              : [...obj.extraLinkedTaskIds, taskId],
            removedLinkedTaskIds: obj.removedLinkedTaskIds.filter((id) => id !== taskId),
          },
        },
        tasks: {
          ...s.tasks,
          [taskId]: {
            ...task,
            extraLinkedObjectiveIds: task.extraLinkedObjectiveIds.includes(objectiveId)
              ? task.extraLinkedObjectiveIds
              : [...task.extraLinkedObjectiveIds, objectiveId],
            removedLinkedObjectiveIds: task.removedLinkedObjectiveIds.filter(
              (id) => id !== objectiveId,
            ),
          },
        },
      };
    }),

  unlinkObjectiveTask: (objectiveId, taskId) =>
    set((s) => {
      const obj = s.objectives[objectiveId];
      const task = s.tasks[taskId];
      if (!obj || !task) return s;
      return {
        objectives: {
          ...s.objectives,
          [objectiveId]: {
            ...obj,
            extraLinkedTaskIds: obj.extraLinkedTaskIds.filter((id) => id !== taskId),
            removedLinkedTaskIds: obj.removedLinkedTaskIds.includes(taskId)
              ? obj.removedLinkedTaskIds
              : [...obj.removedLinkedTaskIds, taskId],
          },
        },
        tasks: {
          ...s.tasks,
          [taskId]: {
            ...task,
            extraLinkedObjectiveIds: task.extraLinkedObjectiveIds.filter(
              (id) => id !== objectiveId,
            ),
            removedLinkedObjectiveIds: task.removedLinkedObjectiveIds.includes(objectiveId)
              ? task.removedLinkedObjectiveIds
              : [...task.removedLinkedObjectiveIds, objectiveId],
          },
        },
      };
    }),

  linkTaskTask: (taskId, otherTaskId) =>
    set((s) => {
      const task = s.tasks[taskId];
      const other = s.tasks[otherTaskId];
      if (!task || !other || taskId === otherTaskId) return s;
      return {
        tasks: {
          ...s.tasks,
          [taskId]: {
            ...task,
            extraLinkedTaskIds: task.extraLinkedTaskIds.includes(otherTaskId)
              ? task.extraLinkedTaskIds
              : [...task.extraLinkedTaskIds, otherTaskId],
            removedLinkedTaskIds: task.removedLinkedTaskIds.filter((id) => id !== otherTaskId),
          },
          [otherTaskId]: {
            ...other,
            extraLinkedTaskIds: other.extraLinkedTaskIds.includes(taskId)
              ? other.extraLinkedTaskIds
              : [...other.extraLinkedTaskIds, taskId],
            removedLinkedTaskIds: other.removedLinkedTaskIds.filter((id) => id !== taskId),
          },
        },
      };
    }),

  unlinkTaskTask: (taskId, otherTaskId) =>
    set((s) => {
      const task = s.tasks[taskId];
      const other = s.tasks[otherTaskId];
      if (!task || !other) return s;
      return {
        tasks: {
          ...s.tasks,
          [taskId]: {
            ...task,
            extraLinkedTaskIds: task.extraLinkedTaskIds.filter((id) => id !== otherTaskId),
            removedLinkedTaskIds: task.removedLinkedTaskIds.includes(otherTaskId)
              ? task.removedLinkedTaskIds
              : [...task.removedLinkedTaskIds, otherTaskId],
          },
          [otherTaskId]: {
            ...other,
            extraLinkedTaskIds: other.extraLinkedTaskIds.filter((id) => id !== taskId),
            removedLinkedTaskIds: other.removedLinkedTaskIds.includes(taskId)
              ? other.removedLinkedTaskIds
              : [...other.removedLinkedTaskIds, taskId],
          },
        },
      };
    }),
}));

// ── Live, project-scoped selectors ──────────────────────────────────────
//
// The Navigator sub-views (Board/List/Network/Timeline) previously read
// getObjectivesByProject/getTasksByObjective/TASKS directly from the static
// fixtures module — so a status change or subtask completion made via the
// sidepanel/fullscreen task view (both of which write here, to
// useDemoItemsStore) never showed up in any of the four views. These two
// hooks are the live equivalents: same filter/sort shape as their static
// fixture counterparts, but read from (and re-render on changes to) this
// store instead.

/** Live, project-scoped, sorted objectives — the store-backed equivalent of
 *  fixtures/objectives.ts's getObjectivesByProject. */
export function useDemoObjectivesByProject(projectId: string): DemoObjectiveState[] {
  const objectives = useDemoItemsStore((s) => s.objectives);
  return useMemo(
    () =>
      Object.values(objectives)
        .filter((o) => o.projectId === projectId && !o.deleted)
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [objectives, projectId],
  );
}

/** Live, project-scoped tasks — the store-backed equivalent of
 *  fixtures/objectives.ts's getTasksByProject. */
export function useDemoTasksByProject(projectId: string): DemoTaskState[] {
  const tasks = useDemoItemsStore((s) => s.tasks);
  return useMemo(
    () => Object.values(tasks).filter((t) => t.projectId === projectId && !t.deleted),
    [tasks, projectId],
  );
}

/** Default + extra linked task ids for an objective, minus removed ones. */
export function linkedTaskIdsForObjective(obj: DemoObjectiveState): string[] {
  const defaultIds = getTasksByObjective(obj.id).map((t) => t.id);
  const all = [...new Set([...defaultIds, ...obj.extraLinkedTaskIds])];
  return all.filter((id) => !obj.removedLinkedTaskIds.includes(id));
}

/** Default (parent) + extra linked objective ids for a task, minus removed ones. */
export function linkedObjectiveIdsForTask(task: DemoTaskState): string[] {
  const defaultIds = task.objectiveId ? [task.objectiveId] : [];
  const all = [...new Set([...defaultIds, ...task.extraLinkedObjectiveIds])];
  return all.filter((id) => !task.removedLinkedObjectiveIds.includes(id));
}

/** Extra linked task ids for a task (no default — tasks have no built-in
 *  task-to-task relationship the way objective<->task has), minus removed ones. */
export function linkedTaskIdsForTask(task: DemoTaskState): string[] {
  return task.extraLinkedTaskIds.filter((id) => !task.removedLinkedTaskIds.includes(id));
}
