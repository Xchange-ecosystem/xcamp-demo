import { create } from "zustand";
import { OBJECTIVES, TASKS, getTasksByObjective } from "@/fixtures/objectives";
import type { Objective, Task } from "@/fixtures/types";
import type { NoteAttachment } from "@/types/xcamp";

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
    TASKS.map((t) => [
      t.id,
      {
        ...t,
        bodyHtml: `<p>${t.title}.</p>`,
        tags: [],
        attachments: [],
        startDate: null,
        endDate: null,
        subtasks: [],
        extraLinkedObjectiveIds: [],
        removedLinkedObjectiveIds: [],
        deleted: false,
      },
    ]),
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
}));

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
