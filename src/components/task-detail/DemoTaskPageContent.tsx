import { useCallback, useMemo, useState } from "react";
import { SidepanelProvider } from "@/contexts/sidepanel";
import { ItemSidepanel } from "@/components/sidepanel/ItemSidepanel";
import { TaskDetailShell } from "@/components/task-detail/TaskDetailShell";
import { useDemoItemsStore } from "@/store/demoItemsStore";
import { getProjectById } from "@/fixtures/projects";
import { getPersonById } from "@/fixtures/people";
import { OBJECTIVES } from "@/fixtures/objectives";
import type { TaskLabelObjective } from "@/lib/xcamp-api";
import type { NoteRow, XcampUser } from "@/types/xcamp";

// Demo counterpart to routes/task.$taskId.tsx's TaskPageContent, used only by
// DemoTaskFullscreenModal. Deliberately NOT a fork of the real
// TaskPageContent's body — that component gates every read behind
// `useAuth()` (self-closes via `if (!authLoading && !user) onClose()`,
// data-fetch effect returns early without a user), which would make a
// signed-out demo viewer bounce straight back out. Rather than editing that
// auth logic in place, this is a standalone data-owning wrapper around the
// same (unchanged) TaskDetailShell — no useAuth() call anywhere in this file.
export function DemoTaskPageContent({ taskId, onClose }: { taskId: string; onClose: () => void }) {
  const task = useDemoItemsStore((s) => s.tasks[taskId]);
  const deleteTask = useDemoItemsStore((s) => s.deleteTask);
  const toggleTaskDone = useDemoItemsStore((s) => s.toggleTaskDone);
  const [removing, setRemoving] = useState(false);

  const project = task ? getProjectById(task.projectId) : undefined;
  const objective = task ? OBJECTIVES.find((o) => o.id === task.objectiveId) : undefined;

  const labels: TaskLabelObjective[] = useMemo(() => {
    if (!task || !project || !objective) return [];
    return [
      {
        id: objective.id,
        title: objective.title,
        dimension: null,
        category: null,
        projectId: project.id,
        projectTitle: project.name,
      },
    ];
  }, [task, project, objective]);

  const noteRow: NoteRow | null = useMemo(() => {
    if (!task) return null;
    return {
      id: task.id,
      title: task.title,
      body_markdown: task.bodyHtml,
      body_html: task.bodyHtml,
      note_type: "task",
      done: task.done,
      status: task.status,
      tags: task.tags,
      detail: { attachments: task.attachments },
      created_by: "demo",
      tenant_id: "demo",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      start_date: task.startDate,
      end_date: task.endDate,
    };
  }, [task]);

  // Real DemoAboutTab/DemoSubtasksTab read/write the demo store directly by
  // id — this stub only exists to satisfy TaskDetailShell/AboutTab's shared
  // prop signature with the real path, and is never called from the demo
  // fork's branches.
  const patchDetail = useCallback(async (_patch: Record<string, unknown>) => {}, []);

  const handleRemove = () => {
    if (!task) return;
    setRemoving(true);
    deleteTask(task.id);
    setRemoving(false);
    onClose();
  };

  const handleComplete = () => {
    if (!task) return;
    toggleTaskDone(task.id);
  };

  if (!task || task.deleted || !noteRow) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          background: "var(--skin-surface)",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <p style={{ color: "var(--skin-ink-soft)", marginBottom: 12 }}>Task not found.</p>
          <button className="x-btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    );
  }

  const demoUser: XcampUser = {
    authId: "demo",
    centralId: "demo",
    tenantId: "demo",
    displayName: "Demo",
  };
  const ownerName =
    (task.assigneeId && getPersonById(task.assigneeId)?.displayName) ||
    (project && getPersonById(project.ownerId)?.displayName) ||
    null;

  return (
    <>
      <TaskDetailShell
        noteRow={noteRow}
        labels={labels}
        ownerName={ownerName}
        user={demoUser}
        onClose={onClose}
        onSaved={() => {}}
        patchDetail={patchDetail}
        onRemove={handleRemove}
        onComplete={handleComplete}
        removing={removing}
      />
      <SidepanelProvider>
        <ItemSidepanel />
      </SidepanelProvider>
    </>
  );
}
