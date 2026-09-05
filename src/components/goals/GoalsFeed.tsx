// "My Goals" — objective+task accordion feed with AI generation (BL-18).
// See docs/phase-0-my-goals-feed-2026-08-25.md for the discovery behind these choices.
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useBlocker } from "@tanstack/react-router";
import { toast } from "sonner";
import { Loader2, Sparkles, Target } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  useObjectives,
  useObjectiveTasks,
  useToggleTask,
  createObjective,
  updateObjective,
  createTaskNote,
  listObjectiveTasks,
  type ObjectiveRow,
} from "@/lib/navigator-api";
import {
  generateGoal,
  generateMoreTasks,
  type GoalGenerationContext,
} from "@/lib/goals-generation";
import { usePendingGoal } from "@/hooks/usePendingGoal";
import { GoalCard, TaskSuggestionCard } from "@/components/goals/GoalCards";
import { useAltitudeStore } from "@/store/altitudeStore";
import { usePersona } from "@/store/personaStore";
import type { XcampUser } from "@/types/xcamp";

export function GoalsFeed({
  user,
  projectId,
  projectTitle,
  projectDescription,
}: {
  user: XcampUser;
  projectId: string;
  projectTitle: string;
  projectDescription: string | null;
}) {
  const objectivesQ = useObjectives(user, projectId);
  const objectives = (objectivesQ.data ?? []).filter((o) => o.title !== "__general__");
  const qc = useQueryClient();

  const { altitude } = useAltitudeStore();
  const { persona } = usePersona();

  const pending = usePendingGoal();
  const [goalInput, setGoalInput] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generatingMore, setGeneratingMore] = useState(false);
  const [busyObjective, setBusyObjective] = useState(false);
  const [busyTaskId, setBusyTaskId] = useState<string | null>(null);

  // ── Unsaved-changes warning ────────────────────────────────────────────────
  // Pending suggestions are pure client-side state (§4 of the phase-0 doc) — anything
  // not accepted is lost on navigation, so warn before both in-app nav and tab close.
  const hasPendingRef = useRef(pending.hasPending);
  useEffect(() => {
    hasPendingRef.current = pending.hasPending;
  }, [pending.hasPending]);

  useBlocker({
    shouldBlockFn: () => {
      if (!hasPendingRef.current) return false;
      return !window.confirm(
        "You have AI-suggested goals that haven't been accepted yet. Leave this page anyway? Anything not accepted will be lost.",
      );
    },
    enableBeforeUnload: () => hasPendingRef.current,
  });

  const buildContext = async (): Promise<GoalGenerationContext> => {
    const existingObjectiveTitles = objectives.map((o) => o.title).filter(Boolean);
    const taskLists = await Promise.all(objectives.map((o) => listObjectiveTasks(o.id)));
    const existingTaskTitles = taskLists
      .flat()
      .map((t) => t.title)
      .filter((t): t is string => !!t);
    return {
      projectId,
      projectTitle,
      projectDescription,
      tenantId: user.tenantId,
      altitude,
      persona,
      existingObjectiveTitles,
      existingTaskTitles,
    };
  };

  const handleCreateGoal = async () => {
    const text = goalInput.trim();
    if (!text || generating) return;
    setGenerating(true);
    try {
      const ctx = await buildContext();
      const result = await generateGoal(ctx, text);
      pending.startGoal(result.objective, result.tasks);
      setGoalInput("");
    } catch (e) {
      toast.error((e as Error).message || "Could not generate a goal.");
    } finally {
      setGenerating(false);
    }
  };

  const handleAddMoreTasks = async () => {
    if (!pending.goal || generatingMore) return;
    setGeneratingMore(true);
    try {
      const ctx = await buildContext();
      const more = await generateMoreTasks(
        ctx,
        { title: pending.goal.title, description: pending.goal.description },
        pending.goal.tasks.map((t) => t.title),
      );
      if (more.length === 0) {
        toast.info("No further task suggestions right now.");
      } else {
        pending.appendTasks(more);
      }
    } catch (e) {
      toast.error((e as Error).message || "Could not generate more tasks.");
    } finally {
      setGeneratingMore(false);
    }
  };

  // Persists the pending objective for real (idempotent — reuses the id once created),
  // since a task can be accepted before the objective card itself is (§6 of the doc).
  const persistObjective = async (): Promise<string> => {
    if (!pending.goal) throw new Error("No pending goal.");
    if (pending.goal.realObjectiveId) return pending.goal.realObjectiveId;
    const created = (await createObjective(projectId, pending.goal.title)) as {
      id?: string;
    } | null;
    const objectiveId = created?.id;
    if (!objectiveId) throw new Error("Objective was created but no id was returned.");
    if (pending.goal.description) {
      await updateObjective(objectiveId, {
        title: pending.goal.title,
        description: pending.goal.description,
      });
    }
    return objectiveId;
  };

  const handleAcceptObjective = async () => {
    if (!pending.goal || busyObjective) return;
    setBusyObjective(true);
    try {
      const objectiveId = await persistObjective();
      pending.acceptObjective(objectiveId);
      await qc.invalidateQueries({ queryKey: ["nav-objectives", projectId] });
      toast.success("Objective created.");
    } catch (e) {
      toast.error((e as Error).message || "Could not create the objective.");
    } finally {
      setBusyObjective(false);
    }
  };

  const handleAcceptTask = async (localId: string) => {
    const task = pending.goal?.tasks.find((t) => t.localId === localId);
    if (!task || busyTaskId) return;
    setBusyTaskId(localId);
    try {
      const objectiveAlreadyReal = pending.goal?.realObjectiveId;
      const objectiveId = await persistObjective();
      const note = await createTaskNote(user, projectId, { title: task.title, objectiveId });
      pending.acceptTask(localId, note.id, objectiveAlreadyReal ? undefined : objectiveId);
      await qc.invalidateQueries({ queryKey: ["nav-objectives", projectId] });
      await qc.invalidateQueries({ queryKey: ["nav-tasks", "objective", objectiveId] });
      toast.success("Task created.");
    } catch (e) {
      toast.error((e as Error).message || "Could not create the task.");
    } finally {
      setBusyTaskId(null);
    }
  };

  const canCreateNewGoal = !generating && !pending.hasPending;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Create New Goal input */}
      <div>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
          <textarea
            className="x-input"
            rows={4}
            style={{
              flex: 1,
              fontSize: 14,
              resize: "vertical",
              overflowY: "auto",
              lineHeight: 1.4,
            }}
            placeholder='Create a new goal… e.g. "Launch our beta waitlist"'
            value={goalInput}
            onChange={(e) => setGoalInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void handleCreateGoal();
              }
            }}
            disabled={!canCreateNewGoal}
          />
          <button
            className="x-btn-primary"
            onClick={() => void handleCreateGoal()}
            disabled={!goalInput.trim() || !canCreateNewGoal}
            style={{ display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}
          >
            {generating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            Create New Goal
          </button>
        </div>
        {pending.hasPending && (
          <p style={{ margin: "6px 0 0", fontSize: 12, color: "var(--skin-ink-faint)" }}>
            Accept or dismiss the pending goal below before creating another.
          </p>
        )}
      </div>

      {/* Pending goal cards */}
      {pending.goal && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <GoalCard
            title={pending.goal.title}
            description={pending.goal.description}
            accepted={pending.goal.status === "accepted"}
            busy={busyObjective}
            generatingMore={generatingMore}
            onAccept={() => void handleAcceptObjective()}
            onDismiss={() => pending.dismissObjective()}
            onAddMoreTasks={() => void handleAddMoreTasks()}
          />
          <div
            style={{
              margin: "0 0 0 22px",
              paddingLeft: 18,
              borderLeft: "2px solid var(--skin-line)",
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            {pending.goal.tasks.map((t) => (
              <TaskSuggestionCard
                key={t.localId}
                title={t.title}
                description={t.description}
                accepted={t.status === "accepted"}
                busy={busyTaskId === t.localId}
                onAccept={() => void handleAcceptTask(t.localId)}
                onDismiss={() => pending.dismissTask(t.localId)}
              />
            ))}
            {pending.goal.tasks.length === 0 && (
              <p style={{ fontSize: 12, color: "var(--skin-ink-faint)", margin: 0 }}>
                No pending tasks — use "Add more tasks" above.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Existing objectives — accordion feed */}
      <div>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--skin-ink)", margin: "0 0 8px" }}>
          Objectives
        </h2>
        {objectivesQ.isLoading && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 13,
              color: "var(--skin-ink-soft)",
              padding: "12px 0",
            }}
          >
            <Loader2 size={14} className="animate-spin" /> Loading…
          </div>
        )}
        {!objectivesQ.isLoading && objectives.length === 0 && !pending.goal && (
          <p style={{ fontSize: 13, color: "var(--skin-ink-faint)" }}>
            No objectives yet — create one above.
          </p>
        )}
        {objectives.length > 0 && (
          <Accordion type="multiple" className="w-full">
            {objectives.map((o) => (
              <ExistingObjectiveItem key={o.id} objective={o} projectId={projectId} />
            ))}
          </Accordion>
        )}
      </div>
    </div>
  );
}

function ExistingObjectiveItem({
  objective,
  projectId,
}: {
  objective: ObjectiveRow;
  projectId: string;
}) {
  const tasksQ = useObjectiveTasks(objective.id);
  const toggleTask = useToggleTask(projectId);
  const tasks = tasksQ.data ?? [];

  return (
    <AccordionItem value={objective.id} style={{ borderColor: "var(--skin-line)" }}>
      <AccordionTrigger>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
          <Target size={14} style={{ color: "var(--skin-accent)", flexShrink: 0 }} />
          <span
            style={{
              flex: 1,
              minWidth: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              fontWeight: 600,
              color: "var(--skin-ink)",
            }}
          >
            {objective.title || "Untitled objective"}
          </span>
          <span style={{ fontSize: 11, color: "var(--skin-ink-faint)", flexShrink: 0 }}>
            {objective.completedTasksCount}/{objective.tasksCount}
          </span>
        </div>
      </AccordionTrigger>
      <AccordionContent>
        {tasksQ.isLoading && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 12.5,
              color: "var(--skin-ink-faint)",
            }}
          >
            <Loader2 size={12} className="animate-spin" /> Loading tasks…
          </div>
        )}
        {!tasksQ.isLoading && tasks.length === 0 && (
          <p style={{ fontSize: 13, color: "var(--skin-ink-faint)", margin: 0 }}>No tasks yet.</p>
        )}
        {tasks.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {tasks.map((t) => {
              const done = !!t.done;
              return (
                <label
                  key={t.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontSize: 13.5,
                    color: done ? "var(--skin-ink-faint)" : "var(--skin-ink)",
                    textDecoration: done ? "line-through" : "none",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={done}
                    onChange={() => toggleTask.mutate({ id: t.id, done: !done })}
                  />
                  {t.title || "(untitled)"}
                </label>
              );
            })}
          </div>
        )}
      </AccordionContent>
    </AccordionItem>
  );
}
