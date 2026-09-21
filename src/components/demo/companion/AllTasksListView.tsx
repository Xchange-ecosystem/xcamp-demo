// src/components/demo/companion/AllTasksListView.tsx
//
// "See all tasks" destination for the Companion Items tab (CompanionInfoPanel
// -> ItemsTabContent). Fixture-only: reads the same TASKS array every other
// screen reads, scoped to the 20 ids companionTaskListFixtures.ts designates
// for this list. Search/filter/dismiss are local component state — nothing
// persists past the session, same as the rest of the Companion altitude.
import { useMemo, useState } from "react";
import { ArrowLeft, Search } from "lucide-react";
import { TASKS } from "@/fixtures/objectives";
import { getProjectById } from "@/fixtures/projects";
import type { Task } from "@/fixtures/types";
import {
  COMPANION_ALL_TASKS_IDS,
  COMPANION_TASK_STATUS_FILTERS,
  getCompanionTaskLifecycleStatus,
  type CompanionTaskLifecycleStatus,
} from "@/components/demo/companion/companionTaskListFixtures";

const STATUS_PILL_COLOR: Record<CompanionTaskLifecycleStatus, string> = {
  suggested: "var(--skin-ink-faint, var(--muted-foreground))",
  open: "var(--skin-accent)",
  active: "var(--skin-warn, #d97706)",
  confirmed: "var(--skin-good)",
};

const ALL_TASKS: Task[] = COMPANION_ALL_TASKS_IDS.map((id) =>
  TASKS.find((t) => t.id === id),
).filter((t): t is Task => !!t);

interface AllTasksListViewProps {
  onBack: () => void;
  dismissedIds: Set<string>;
  onDismiss: (taskId: string) => void;
  onOpen: (task: Task) => void;
}

export function AllTasksListView({
  onBack,
  dismissedIds,
  onDismiss,
  onOpen,
}: AllTasksListViewProps) {
  const [query, setQuery] = useState("");
  const [activeStatuses, setActiveStatuses] = useState<Set<CompanionTaskLifecycleStatus>>(
    new Set(),
  );

  const toggleStatus = (key: CompanionTaskLifecycleStatus) => {
    setActiveStatuses((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const visibleTasks = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ALL_TASKS.filter((task) => {
      if (dismissedIds.has(task.id)) return false;
      const lifecycle = getCompanionTaskLifecycleStatus(task.id);
      if (activeStatuses.size > 0 && !activeStatuses.has(lifecycle)) return false;
      if (!q) return true;
      const project = getProjectById(task.projectId);
      return (
        task.title.toLowerCase().includes(q) || (project?.name ?? "").toLowerCase().includes(q)
      );
    });
  }, [query, activeStatuses, dismissedIds]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <button
        type="button"
        onClick={onBack}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          alignSelf: "flex-start",
          background: "none",
          border: "none",
          padding: 0,
          fontSize: 12,
          fontWeight: 600,
          color: "var(--skin-ink-soft)",
          cursor: "pointer",
        }}
      >
        <ArrowLeft size={14} /> Back
      </button>

      <h2 style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "var(--skin-ink-soft)" }}>
        All tasks
      </h2>

      <div style={{ position: "relative" }}>
        <Search
          size={14}
          style={{
            position: "absolute",
            left: 10,
            top: "50%",
            transform: "translateY(-50%)",
            color: "var(--skin-ink-faint)",
          }}
        />
        <input
          className="x-input"
          style={{ paddingLeft: 30, fontSize: 12, padding: "7px 10px 7px 30px" }}
          placeholder="Search by title or project…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {COMPANION_TASK_STATUS_FILTERS.map(({ key, label }) => {
          const active = activeStatuses.has(key);
          return (
            <button
              key={key}
              type="button"
              onClick={() => toggleStatus(key)}
              style={{
                padding: "4px 10px",
                borderRadius: 999,
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
                border: `1px solid ${active ? "transparent" : "var(--skin-line)"}`,
                background: active ? STATUS_PILL_COLOR[key] : "var(--skin-surface2)",
                color: active ? "var(--skin-on-accent, #fff)" : "var(--skin-ink-soft)",
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {visibleTasks.length === 0 ? (
          <p style={{ fontSize: 12, color: "var(--skin-ink-faint)" }}>No tasks match.</p>
        ) : (
          visibleTasks.map((task) => (
            <TaskListCard
              key={task.id}
              task={task}
              onOpen={() => onOpen(task)}
              onDismiss={() => onDismiss(task.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

function TaskListCard({
  task,
  onOpen,
  onDismiss,
}: {
  task: Task;
  onOpen: () => void;
  onDismiss: () => void;
}) {
  const project = getProjectById(task.projectId);
  const lifecycle = getCompanionTaskLifecycleStatus(task.id);
  return (
    <div
      style={{
        borderRadius: 8,
        padding: 10,
        background: "var(--skin-raised, var(--muted))",
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--skin-ink)" }}>
            {task.title}
          </div>
          <div style={{ marginTop: 2, fontSize: 11, color: "var(--skin-ink-soft)" }}>
            {project?.name ?? "Unknown project"} · due {task.dueDate}
          </div>
        </div>
        <span
          style={{
            flexShrink: 0,
            padding: "2px 8px",
            borderRadius: 999,
            fontSize: 10,
            fontWeight: 600,
            textTransform: "capitalize",
            color: "#fff",
            background: STATUS_PILL_COLOR[lifecycle],
          }}
        >
          {lifecycle}
        </span>
      </div>
      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
        {lifecycle === "suggested" && (
          <button
            type="button"
            onClick={onDismiss}
            style={{
              background: "none",
              border: "1px solid var(--skin-line)",
              borderRadius: 6,
              padding: "3px 10px",
              fontSize: 11,
              color: "var(--skin-ink-soft)",
              cursor: "pointer",
            }}
          >
            Dismiss
          </button>
        )}
        <button
          type="button"
          onClick={onOpen}
          style={{
            background: "var(--skin-accent)",
            border: "none",
            borderRadius: 6,
            padding: "3px 10px",
            fontSize: 11,
            fontWeight: 600,
            color: "var(--skin-on-accent, #fff)",
            cursor: "pointer",
          }}
        >
          Open
        </button>
      </div>
    </div>
  );
}
