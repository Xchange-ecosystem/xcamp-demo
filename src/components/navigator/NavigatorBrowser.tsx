import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Target, Inbox, Compass, ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/auth";
import { useActiveProject } from "@/contexts/active-project";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import {
  useObjectives,
  useObjectiveTasks,
  useUnassignedTasks,
  useCreateObjective,
  useUpdateObjective,
  useCreateTask,
  useToggleTask,
  getNoteById,
  type ObjectiveRow,
  type NavTask,
} from "@/lib/navigator-api";
import { listProjects, updateNote, archiveNote } from "@/lib/xcamp-api";
import { NoteEditor, type Editing, type NoteEditorValues } from "@/components/editor/NoteEditor";
import { ObjectiveEditor, type ObjectiveEditorValues } from "@/components/navigator/ObjectiveEditor";
import type { NoteRow } from "@/types/xcamp";

const UNASSIGNED = "__unassigned__";

type EditTarget =
  | { kind: "note"; note: NoteRow }
  | { kind: "objective"; objective: ObjectiveRow }
  | null;

export function NavigatorBrowser() {
  const { user } = useAuth();
  const { activeProjectId, setActiveProjectId } = useActiveProject();
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();

  const [selectedObj, setSelectedObj] = useState<string | null>(null);
  const [editing, setEditing] = useState<EditTarget>(null);

  const projectsQuery = useQuery({
    queryKey: ["projects", user?.tenantId],
    queryFn: () => listProjects(user!),
    enabled: !!user,
  });
  const projects = projectsQuery.data ?? [];

  const onChangeProject = (id: string) => {
    setActiveProjectId(id || null);
    setSelectedObj(null);
    setEditing(null);
  };

  const createObj = useCreateObjective(user!, activeProjectId ?? "");
  const updateObj = useUpdateObjective(user!, activeProjectId ?? "");
  const createTask = useCreateTask(user!, activeProjectId ?? "");
  const toggleTask = useToggleTask(activeProjectId ?? "");

  const updateNoteMut = useMutation({
    mutationFn: (input: { noteId: string; values: NoteEditorValues; existingDetail: Record<string, unknown> }) =>
      updateNote(user!, input.noteId, { ...input.values, existingDetail: input.existingDetail }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["nav-tasks"] });
      setEditing(null);
    },
  });

  const archiveNoteMut = useMutation({
    mutationFn: (note: NoteRow) => archiveNote(user!, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["nav-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["nav-objectives"] });
      setEditing(null);
    },
  });

  const updateObjMut = useMutation({
    mutationFn: (input: { objective: ObjectiveRow; values: ObjectiveEditorValues }) =>
      updateObj.mutateAsync({
        objectiveId: input.objective.id,
        title: input.values.title,
        description: input.values.description,
        status: input.values.status,
      }),
    onSuccess: () => setEditing(null),
  });

  const openTask = async (id: string) => {
    const note = await getNoteById(id);
    if (note) setEditing({ kind: "note", note });
  };

  if (!user) return null;

  if (!activeProjectId) {
    return (
      <EmptyShell>
        <p style={{ fontSize: 15, color: "var(--skin-ink-soft)", marginBottom: 6 }}>
          No project selected.
        </p>
        <p style={{ fontSize: 13, color: "var(--skin-ink-faint)" }}>
          Pick a project from the sidebar to start navigating.
        </p>
      </EmptyShell>
    );
  }

  // ---- Editor view (full area) ----
  if (editing) {
    return (
      <div style={{ background: "var(--skin-bg)", height: "100vh", overflowY: "auto" }}>
        <div style={{ padding: isMobile ? 16 : 32, maxWidth: 880, margin: "0 auto" }}>
          {editing.kind === "note" ? (
            <NoteEditor
              key={editing.note.id}
              editing={{ mode: "edit", note: editing.note } as Editing}
              projects={projects}
              user={user}
              saving={updateNoteMut.isPending}
              archiving={archiveNoteMut.isPending}
              onCancel={() => setEditing(null)}
              onSave={(values) =>
                updateNoteMut.mutate({
                  noteId: editing.note.id,
                  values,
                  existingDetail: editing.note.detail,
                })
              }
              onArchive={() => archiveNoteMut.mutate(editing.note)}
            />
          ) : (
            <ObjectiveEditor
              key={editing.objective.id}
              objective={editing.objective}
              saving={updateObjMut.isPending}
              onCancel={() => setEditing(null)}
              onSave={(values) => updateObjMut.mutate({ objective: editing.objective, values })}
            />
          )}
        </div>
      </div>
    );
  }

  // ---- Browser columns ----
  const header = (
    <div
      className="flex items-center justify-between gap-2 px-4 py-3"
      style={{ borderBottom: "1px solid var(--skin-line)", background: "var(--skin-surface)" }}
    >
      <div className="flex items-center gap-2 min-w-0">
        <Compass size={18} style={{ color: "var(--skin-accent)", flexShrink: 0 }} />
        <h1 className="truncate" style={{ fontSize: 16, fontWeight: 600, color: "var(--skin-ink)" }}>
          Navigator
        </h1>
      </div>
      {projects.length > 0 && (
        <select
          className="x-input"
          style={{ height: 32, fontSize: 13, maxWidth: isMobile ? 180 : 280 }}
          value={activeProjectId ?? ""}
          onChange={(e) => onChangeProject(e.target.value)}
        >
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      )}
    </div>
  );

  // Mobile: one column at a time (objectives -> tasks)
  if (isMobile) {
    return (
      <div style={{ background: "var(--skin-bg)", height: "100vh", display: "flex", flexDirection: "column" }}>
        {header}
        <div style={{ flex: 1, minHeight: 0 }}>
          {selectedObj === null ? (
            <ObjectivesColumn
              user={user}
              projectId={activeProjectId}
              selected={selectedObj}
              onSelect={setSelectedObj}
              onOpenObjective={(o) => setEditing({ kind: "objective", objective: o })}
              createObj={createObj}
            />
          ) : (
            <TasksColumn
              projectId={activeProjectId}
              objectiveId={selectedObj}
              onBack={() => setSelectedObj(null)}
              onOpenTask={openTask}
              createTask={createTask}
              toggleTask={toggleTask}
            />
          )}
        </div>
      </div>
    );
  }

  // Desktop: two resizable panes
  return (
    <div style={{ background: "var(--skin-bg)", height: "100vh", display: "flex", flexDirection: "column" }}>
      {header}
      <div style={{ flex: 1, minHeight: 0 }}>
        <ResizablePanelGroup orientation="horizontal">
          <ResizablePanel defaultSize={34} minSize={20}>
            <ObjectivesColumn
              user={user}
              projectId={activeProjectId}
              selected={selectedObj}
              onSelect={setSelectedObj}
              onOpenObjective={(o) => setEditing({ kind: "objective", objective: o })}
              createObj={createObj}
            />
          </ResizablePanel>
          <ResizableHandle />
          <ResizablePanel defaultSize={66} minSize={30}>
            <TasksColumn
              projectId={activeProjectId}
              objectiveId={selectedObj}
              onOpenTask={openTask}
              createTask={createTask}
              toggleTask={toggleTask}
            />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
}

function EmptyShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex items-center justify-center text-center"
      style={{ background: "var(--skin-bg)", height: "100vh", padding: 24 }}
    >
      <div>{children}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Objectives column                                                   */
/* ------------------------------------------------------------------ */

function ObjectivesColumn({
  user,
  projectId,
  selected,
  onSelect,
  onOpenObjective,
  createObj,
}: {
  user: import("@/types/xcamp").XcampUser;
  projectId: string;
  selected: string | null;
  onSelect: (id: string | null) => void;
  onOpenObjective: (o: ObjectiveRow) => void;
  createObj: ReturnType<typeof useCreateObjective>;
}) {
  const { data: objectives = [], isLoading } = useObjectives(user, projectId);
  const [draft, setDraft] = useState("");

  const submit = async () => {
    if (!draft.trim()) return;
    const o = await createObj.mutateAsync(draft.trim());
    setDraft("");
    if (o?.id) onSelect(o.id);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "var(--skin-surface)" }}>
      <ColumnHeader title="Objectives" count={objectives.length} />
      <div style={{ flex: 1, overflowY: "auto", padding: 8, display: "flex", flexDirection: "column", gap: 6 }}>
        <button
          onClick={() => onSelect(UNASSIGNED)}
          className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left"
          style={{
            fontSize: 14,
            cursor: "pointer",
            border: "none",
            background: selected === UNASSIGNED ? "var(--skin-surface2)" : "transparent",
            color: selected === UNASSIGNED ? "var(--skin-accent)" : "var(--skin-ink-soft)",
          }}
        >
          <Inbox size={15} /> Unassigned
        </button>

        {isLoading && (
          <p style={{ padding: "16px 8px", textAlign: "center", fontSize: 13, color: "var(--skin-ink-faint)" }}>
            Loading…
          </p>
        )}

        {objectives.map((o) => {
          const isActive = selected === o.id;
          return (
            <div
              key={o.id}
              onClick={() => onSelect(o.id)}
              className="flex w-full flex-col gap-1 rounded-lg px-2.5 py-2"
              style={{
                cursor: "pointer",
                border: `1px solid ${isActive ? "var(--skin-accent)" : "var(--skin-line)"}`,
                background: isActive ? "var(--skin-surface2)" : "var(--skin-bg)",
              }}
            >
              <div className="flex items-center gap-2 min-w-0">
                <Target size={14} style={{ flexShrink: 0, color: "var(--skin-accent)" }} />
                <span
                  className="flex-1 truncate"
                  style={{ fontSize: 14, color: isActive ? "var(--skin-accent)" : "var(--skin-ink)", fontWeight: isActive ? 600 : 400 }}
                >
                  {o.title || "Untitled objective"}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenObjective(o);
                  }}
                  title="Edit details"
                  style={{ fontSize: 11, color: "var(--skin-accent)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                >
                  Open
                </button>
              </div>
              <div className="flex items-center justify-between gap-2" style={{ fontSize: 11, color: "var(--skin-ink-faint)" }}>
                <span style={{ textTransform: "capitalize" }}>
                  {(o.status ?? "").replace("_", " ") || "draft"}
                </span>
                <span>
                  {o.completedTasksCount}/{o.tasksCount} tasks
                </span>
              </div>
            </div>
          );
        })}

        {!isLoading && objectives.length === 0 && (
          <p style={{ padding: "12px 8px", fontSize: 13, color: "var(--skin-ink-faint)" }}>
            No objectives yet.
          </p>
        )}
      </div>
      <ColumnFooter
        value={draft}
        onChange={setDraft}
        onSubmit={submit}
        placeholder="New objective…"
        disabled={!draft.trim() || createObj.isPending}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Tasks column                                                        */
/* ------------------------------------------------------------------ */

function TasksColumn({
  projectId,
  objectiveId,
  onBack,
  onOpenTask,
  createTask,
  toggleTask,
}: {
  projectId: string;
  objectiveId: string | null;
  onBack?: () => void;
  onOpenTask: (id: string) => void;
  createTask: ReturnType<typeof useCreateTask>;
  toggleTask: ReturnType<typeof useToggleTask>;
}) {
  const isUnassigned = objectiveId === UNASSIGNED;
  const tasksQ = useObjectiveTasks(!isUnassigned && objectiveId ? objectiveId : null);
  const unassignedQ = useUnassignedTasks(projectId, isUnassigned);
  const tasks: NavTask[] = isUnassigned ? unassignedQ.data ?? [] : tasksQ.data ?? [];
  const isLoading = isUnassigned ? unassignedQ.isLoading : tasksQ.isLoading;

  const [draft, setDraft] = useState("");

  const submit = async () => {
    if (!draft.trim() || !objectiveId) return;
    await createTask.mutateAsync({
      title: draft.trim(),
      objectiveId: isUnassigned ? null : objectiveId,
    });
    setDraft("");
  };

  if (!objectiveId) {
    return (
      <div
        className="flex items-center justify-center text-center"
        style={{ height: "100%", background: "var(--skin-bg)", padding: 24, fontSize: 14, color: "var(--skin-ink-faint)" }}
      >
        Select an objective to see its tasks.
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "var(--skin-bg)" }}>
      <div
        className="flex items-center gap-2 px-3 py-2"
        style={{ borderBottom: "1px solid var(--skin-line)" }}
      >
        {onBack && (
          <button
            onClick={onBack}
            className="x-btn-secondary"
            aria-label="Back to objectives"
            style={{ height: 28, width: 28, padding: 0, display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <ArrowLeft size={14} />
          </button>
        )}
        <h3 style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, color: "var(--skin-ink-faint)" }}>
          Tasks
        </h3>
        <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--skin-ink-faint)" }}>{tasks.length}</span>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: 8, display: "flex", flexDirection: "column", gap: 4 }}>
        {isLoading && (
          <p style={{ padding: "24px 8px", textAlign: "center", fontSize: 13, color: "var(--skin-ink-faint)" }}>
            Loading…
          </p>
        )}
        {!isLoading && tasks.length === 0 && (
          <p style={{ padding: "24px 8px", textAlign: "center", fontSize: 13, color: "var(--skin-ink-faint)" }}>
            No tasks yet.
          </p>
        )}
        {tasks.map((t) => {
          const done = !!t.done;
          return (
            <div
              key={t.id}
              className="group flex items-start gap-2 rounded-md px-2 py-2"
              style={{ cursor: "pointer" }}
            >
              <input
                type="checkbox"
                checked={done}
                onChange={() => toggleTask.mutate({ id: t.id, done: !done })}
                style={{ marginTop: 3 }}
              />
              <button
                onClick={() => onOpenTask(t.id)}
                className="flex-1 truncate text-left"
                style={{
                  fontSize: 14,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  textDecoration: done ? "line-through" : "none",
                  color: done ? "var(--skin-ink-faint)" : "var(--skin-ink)",
                }}
              >
                {t.title || "(untitled)"}
              </button>
            </div>
          );
        })}
      </div>

      <ColumnFooter
        value={draft}
        onChange={setDraft}
        onSubmit={submit}
        placeholder="New task…"
        disabled={!draft.trim() || createTask.isPending}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Shared bits                                                         */
/* ------------------------------------------------------------------ */

function ColumnHeader({ title, count }: { title: string; count: number }) {
  return (
    <div
      className="flex items-center justify-between px-3 py-2"
      style={{ borderBottom: "1px solid var(--skin-line)" }}
    >
      <h3 style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, color: "var(--skin-ink-faint)" }}>
        {title}
      </h3>
      <span style={{ fontSize: 11, color: "var(--skin-ink-faint)" }}>{count}</span>
    </div>
  );
}

function ColumnFooter({
  value,
  onChange,
  onSubmit,
  placeholder,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  placeholder: string;
  disabled: boolean;
}) {
  return (
    <div style={{ borderTop: "1px solid var(--skin-line)", padding: 8 }}>
      <div className="flex gap-1">
        <input
          className="x-input"
          style={{ flex: 1, height: 34, fontSize: 13 }}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onSubmit()}
          placeholder={placeholder}
        />
        <button
          className="x-btn-primary"
          onClick={onSubmit}
          disabled={disabled}
          style={{ height: 34, width: 36, padding: 0, display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <Plus size={15} />
        </button>
      </div>
    </div>
  );
}
