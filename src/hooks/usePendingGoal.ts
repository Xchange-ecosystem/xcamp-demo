// Pending-state for the "My Goals" feed's AI-generated objective+tasks.
//
// Pure client-side state — nothing here is persisted until the user explicitly
// accepts an item. Confirmed in docs/phase-0-my-goals-feed-2026-08-25.md (§4) that
// neither `objectives` nor `notes` has a draft/pending DB column to lean on, so this
// mirrors Journal's own approach (JournalFlow.tsx keeps generated topics in local
// React state until Accept/Dismiss).
import { useCallback, useState } from "react";
import type { GeneratedItem } from "@/lib/goals-generation";

export interface PendingTask {
  localId: string;
  title: string;
  description: string;
  status: "pending" | "accepted";
  realNoteId?: string;
}

export interface PendingGoal {
  localId: string;
  title: string;
  description: string;
  status: "pending" | "accepted";
  realObjectiveId?: string;
  tasks: PendingTask[];
}

function makeLocalId(): string {
  return `pending-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function usePendingGoal() {
  const [goal, setGoal] = useState<PendingGoal | null>(null);

  const startGoal = useCallback((objective: GeneratedItem, tasks: GeneratedItem[]) => {
    setGoal({
      localId: makeLocalId(),
      title: objective.title,
      description: objective.description,
      status: "pending",
      tasks: tasks.map((t) => ({
        localId: makeLocalId(),
        title: t.title,
        description: t.description,
        status: "pending",
      })),
    });
  }, []);

  const appendTasks = useCallback((tasks: GeneratedItem[]) => {
    setGoal((prev) =>
      prev
        ? {
            ...prev,
            tasks: [
              ...prev.tasks,
              ...tasks.map((t) => ({
                localId: makeLocalId(),
                title: t.title,
                description: t.description,
                status: "pending" as const,
              })),
            ],
          }
        : prev,
    );
  }, []);

  const acceptObjective = useCallback((realObjectiveId: string) => {
    setGoal((prev) => (prev ? { ...prev, status: "accepted", realObjectiveId } : prev));
  }, []);

  const acceptTask = useCallback(
    (localId: string, realNoteId: string, realObjectiveId?: string) => {
      setGoal((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          // Accepting a task before its objective persists the objective first
          // (§6 of the phase-0 doc) — reflect that here too.
          status: realObjectiveId ? "accepted" : prev.status,
          realObjectiveId: realObjectiveId ?? prev.realObjectiveId,
          tasks: prev.tasks.map((t) =>
            t.localId === localId ? { ...t, status: "accepted", realNoteId } : t,
          ),
        };
      });
    },
    [],
  );

  const dismissTask = useCallback((localId: string) => {
    setGoal((prev) =>
      prev ? { ...prev, tasks: prev.tasks.filter((t) => t.localId !== localId) } : prev,
    );
  }, []);

  const dismissObjective = useCallback(() => {
    setGoal(null);
  }, []);

  const clearIfResolved = useCallback(() => {
    setGoal((prev) => {
      if (!prev) return prev;
      const resolved =
        prev.status === "accepted" && prev.tasks.every((t) => t.status === "accepted");
      return resolved ? null : prev;
    });
  }, []);

  const hasPending =
    !!goal && (goal.status === "pending" || goal.tasks.some((t) => t.status === "pending"));

  return {
    goal,
    hasPending,
    startGoal,
    appendTasks,
    acceptObjective,
    acceptTask,
    dismissTask,
    dismissObjective,
    clearIfResolved,
  };
}
