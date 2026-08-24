// ─────────────────────────────────────────────────────────────────────────
// THROWAWAY SANDBOX — not a real app surface. Not linked from any nav.
//
// Reproduces xcamp-foundation's "live" (production) task-detail surface:
// DeliverBoard's TaskCard + TaskDetailPanel pair
// (xcamp-foundation/src/features/objectives/modal/stages.tsx, lines
// 497–933). Flat, no tabs — matches the surface as it actually exists.
// Re-implemented from a read-only reference read of xcamp-foundation —
// nothing imported from that repo.
//
// Colors/radii below are xcamp-foundation's own literal --obj-* tokens for
// its default "scientific" skin (see its src/styles/tokens.css +
// src/app/store/shellStore.ts), hardcoded on purpose rather than reusing
// nox's Tailwind color utilities, which resolve to a different palette.
// Layout-only Tailwind utilities (flex/grid/gap/padding/text-size) are
// still used freely.
//
// Real data: same dev-tenant objective as /sandbox/task-panel-v3 ("Hey ho
// lets go"), so the two routes are directly comparable. Requires the
// signed-in user to have RLS access to that objective (e.g.
// dev-superadmin@xcamp.local) — same as any other objective view in the
// app. Only the "done" toggle writes to the DB; everything else is
// interactive but non-persisting.
// ─────────────────────────────────────────────────────────────────────────
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  Circle,
  MoreHorizontal,
  Archive,
  Plus,
  Paperclip,
  Link2,
  StickyNote,
  FileText,
  ExternalLink,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { SandboxBanner } from "@/components/sandbox/SandboxBanner";

export const Route = createFileRoute("/sandbox/task-panel-live")({
  head: () => ({ meta: [{ title: "Sandbox — Task Panel Live" }] }),
  component: SandboxTaskPanelLive,
});

// xcamp-foundation's --obj-* tokens, "scientific" skin (the default), light theme.
const OBJ = {
  bg: "hsl(0 0% 97%)",
  surface: "hsl(0 0% 100%)",
  surface2: "hsl(220 14% 96%)",
  ink: "hsl(220 13% 10%)",
  inkSoft: "hsl(220 9% 46%)",
  inkFaint: "hsl(220 6% 64%)",
  line: "hsl(220 13% 91%)",
  good: "hsl(142 76% 36%)",
  accent: "hsl(213 70% 48%)",
  radius: 5,
  radiusLg: 7,
};

// "Hey ho lets go" objective, dev tenant 30a00e60-7cae-4a5e-a311-b3be998e7113.
const OBJECTIVE_ID = "7eb9d60e-6f1d-4552-a68a-175db329d183";
// "Hiphop" task — same default selection as the v3 sandbox, for a fair comparison.
const DEFAULT_TASK_ID = "8b27891d-cf5c-455b-bdec-7d021f97badc";

type NoteRow = {
  id: string;
  title: string;
  done: boolean;
  note_type: string;
};

type FeedFilter = "all" | "proof" | "resource" | "note";

const LINKED_FEED_TYPES = ["proof", "resource", "note"];

async function fetchObjective(objectiveId: string): Promise<{ description: string | null }> {
  const { data } = await supabase
    .from("objectives")
    .select("description")
    .eq("id", objectiveId)
    .maybeSingle();
  return { description: data?.description ?? null };
}

async function fetchNotes(objectiveId: string): Promise<NoteRow[]> {
  const { data, error } = await supabase
    .from("objective_notes")
    .select("note:notes(id, title, done, note_type)")
    .eq("objective_id", objectiveId);
  if (error || !data) return [];
  return (data as unknown as Array<{ note: NoteRow }>).map((r) => r.note).filter(Boolean);
}

async function fetchLinkedFeed(taskId: string): Promise<NoteRow[]> {
  const linksFrom = await supabase
    .from("note_links")
    .select("to_note_id")
    .eq("from_note_id", taskId);
  if (linksFrom.error || !linksFrom.data?.length) return [];
  const targetIds = linksFrom.data.map((r) => r.to_note_id);
  const { data, error } = await supabase
    .from("notes")
    .select("id, title, done, note_type")
    .in("id", targetIds);
  if (error || !data) return [];
  return (data as NoteRow[]).filter((n) => LINKED_FEED_TYPES.includes(n.note_type));
}

function extractGoalText(description: string | null | undefined): string {
  return (description ?? "").trim();
}

function SandboxTaskPanelLive() {
  const qc = useQueryClient();
  const { data: objective } = useQuery({
    queryKey: ["sandbox-live-objective", OBJECTIVE_ID],
    queryFn: () => fetchObjective(OBJECTIVE_ID),
  });
  const { data: notes = [] } = useQuery({
    queryKey: ["sandbox-live-notes", OBJECTIVE_ID],
    queryFn: () => fetchNotes(OBJECTIVE_ID),
  });
  const tasks = notes.filter((n) => n.note_type === "task");

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(DEFAULT_TASK_ID);
  useEffect(() => {
    if (selectedTaskId && !tasks.some((t) => t.id === selectedTaskId)) {
      setSelectedTaskId(tasks[0]?.id ?? null);
    } else if (!selectedTaskId && tasks.length) {
      setSelectedTaskId(tasks[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks.length]);
  const selectedTask = tasks.find((t) => t.id === selectedTaskId) ?? null;

  const [feedFilter, setFeedFilter] = useState<FeedFilter>("all");
  const { data: linkedToTask = [] } = useQuery({
    queryKey: ["sandbox-live-feed", selectedTaskId],
    enabled: !!selectedTaskId,
    queryFn: () => fetchLinkedFeed(selectedTaskId as string),
  });
  const filteredFeed =
    feedFilter === "all" ? linkedToTask : linkedToTask.filter((n) => n.note_type === feedFilter);

  const handleToggleDone = async (noteId: string, done: boolean) => {
    await supabase.from("notes").update({ done }).eq("id", noteId);
    qc.invalidateQueries({ queryKey: ["sandbox-live-notes", OBJECTIVE_ID] });
  };

  const goalText = extractGoalText(objective?.description);

  return (
    <div style={{ minHeight: "100vh", background: OBJ.bg, color: OBJ.ink }}>
      <SandboxBanner
        label="xcamp-foundation — live (objectives/modal/stages.tsx, DeliverBoard)"
        note='Real data from the "Hey ho lets go" objective in the shared dev tenant — same task as the v3 sandbox. Empty if you are not signed in as a project member (e.g. dev-superadmin@xcamp.local).'
      />
      <div style={{ maxWidth: 1100, margin: "20px auto 40px", padding: "0 20px" }}>
        <StageHeader
          title="Deliver"
          hint="Goal pinned above the task list. Right panel shows the selected task's proof, resources and notes."
        />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_360px]">
          <div className="min-w-0 space-y-3">
            <div
              style={{
                borderRadius: OBJ.radiusLg,
                border: `1px solid ${OBJ.line}`,
                background: OBJ.surface2,
                padding: 12,
              }}
            >
              <Label>Goal</Label>
              {goalText ? (
                <p
                  style={{ fontSize: 14, color: OBJ.ink, whiteSpace: "pre-wrap", lineHeight: 1.3 }}
                >
                  {goalText}
                </p>
              ) : (
                <p style={{ fontSize: 12, color: OBJ.inkFaint }}>
                  No goal captured yet. Add one in About.
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              {tasks.length === 0 && (
                <EmptyHint>No tasks yet. Add the first deliverable below.</EmptyHint>
              )}
              {tasks.map((t) => (
                <TaskCard
                  key={t.id}
                  note={t}
                  selected={selectedTaskId === t.id}
                  onSelect={setSelectedTaskId}
                  onToggleDone={handleToggleDone}
                />
              ))}
            </div>

            <AddTaskInline />
          </div>

          <aside
            className="self-start"
            style={{
              borderRadius: OBJ.radiusLg,
              border: `1px solid ${OBJ.line}`,
              background: OBJ.surface,
              padding: 12,
            }}
          >
            {selectedTask ? (
              <TaskDetailPanel
                task={selectedTask}
                feed={filteredFeed}
                feedFilter={feedFilter}
                onFilterChange={setFeedFilter}
              />
            ) : (
              <p style={{ fontSize: 12, color: OBJ.inkFaint }}>
                Select a task to see its proof, resources and notes.
              </p>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}

function StageHeader({ title, hint }: { title: string; hint?: string }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: OBJ.ink }}>{title}</h1>
      {hint && <p style={{ marginTop: 2, fontSize: 12, color: OBJ.inkSoft }}>{hint}</p>}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        marginBottom: 4,
        fontSize: 10,
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: "0.09em",
        color: OBJ.inkSoft,
      }}
    >
      {children}
    </div>
  );
}

function EmptyHint({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        borderRadius: OBJ.radius,
        border: `1px dashed ${OBJ.line}`,
        padding: "12px",
        fontSize: 12,
        color: OBJ.inkFaint,
        textAlign: "center",
      }}
    >
      {children}
    </div>
  );
}

function TaskCard({
  note,
  selected,
  onSelect,
  onToggleDone,
}: {
  note: NoteRow;
  selected: boolean;
  onSelect: (id: string) => void;
  onToggleDone: (id: string, done: boolean) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div
      onClick={() => onSelect(note.id)}
      className="group flex items-start gap-2"
      style={{
        cursor: "pointer",
        borderRadius: OBJ.radius,
        border: `1px solid ${selected ? OBJ.accent : OBJ.line}`,
        background: OBJ.surface,
        padding: "8px 12px",
      }}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggleDone(note.id, !note.done);
        }}
        aria-label={note.done ? "Mark task as not done" : "Mark task as done"}
        style={{
          marginTop: 2,
          background: "none",
          border: "none",
          cursor: "pointer",
          color: OBJ.inkSoft,
          display: "flex",
        }}
      >
        {note.done ? <CheckCircle2 size={14} color={OBJ.good} /> : <Circle size={14} />}
      </button>
      <div className="min-w-0 flex-1">
        <p
          style={{
            fontSize: 14,
            lineHeight: 1.3,
            margin: 0,
            color: note.done ? OBJ.inkSoft : OBJ.ink,
            textDecoration: note.done ? "line-through" : "none",
          }}
        >
          {note.title || "Untitled task"}
        </p>
      </div>
      <div style={{ position: "relative" }}>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen((v) => !v);
          }}
          className="opacity-0 group-hover:opacity-100"
          aria-label="Task actions"
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: OBJ.inkFaint,
            display: "flex",
          }}
        >
          <MoreHorizontal size={14} />
        </button>
        {menuOpen && (
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "absolute",
              right: 0,
              top: 20,
              zIndex: 10,
              minWidth: 140,
              borderRadius: OBJ.radius,
              border: `1px solid ${OBJ.line}`,
              background: OBJ.surface,
              boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
            }}
          >
            <button
              type="button"
              disabled
              className="flex w-full items-center gap-2"
              style={{
                textAlign: "left",
                padding: "6px 12px",
                fontSize: 12,
                color: OBJ.ink,
                background: "none",
                border: "none",
                cursor: "not-allowed",
                opacity: 0.55,
              }}
            >
              <Archive size={11} /> Archive
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function AddTaskInline() {
  const [title, setTitle] = useState("");
  return (
    <div className="flex gap-2">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Add a task…"
        style={{
          flex: 1,
          borderRadius: OBJ.radius,
          border: `1px solid ${OBJ.line}`,
          background: OBJ.surface,
          padding: "6px 10px",
          fontSize: 14,
          color: OBJ.ink,
        }}
      />
      <button
        type="button"
        disabled={!title.trim()}
        className="inline-flex items-center gap-1"
        style={{
          borderRadius: OBJ.radius,
          padding: "6px 12px",
          fontSize: 12,
          fontWeight: 500,
          background: OBJ.accent,
          color: "#fff",
          opacity: title.trim() ? 1 : 0.5,
          cursor: "not-allowed",
          border: "none",
        }}
      >
        <Plus size={12} /> Add
      </button>
    </div>
  );
}

function TaskDetailPanel({
  task,
  feed,
  feedFilter,
  onFilterChange,
}: {
  task: NoteRow;
  feed: NoteRow[];
  feedFilter: FeedFilter;
  onFilterChange: (f: FeedFilter) => void;
}) {
  return (
    <div className="space-y-3">
      <div>
        <Label>Selected task</Label>
        <p style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.3, margin: 0, color: OBJ.ink }}>
          {task.title || "Untitled task"}
        </p>
        <div
          className="flex items-center gap-3"
          style={{ marginTop: 4, fontSize: 11, color: OBJ.inkSoft }}
        >
          <span>{task.done ? "Done" : "Open"}</span>
          <span>·</span>
          <span>0 assignees</span>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
          <Label>Linked</Label>
          <div className="flex gap-1">
            {(["all", "proof", "resource", "note"] as const).map((f) => (
              <FilterPill
                key={f}
                label={f}
                active={feedFilter === f}
                onClick={() => onFilterChange(f)}
              />
            ))}
          </div>
        </div>
        {feed.length === 0 ? (
          <EmptyHint>Nothing linked yet.</EmptyHint>
        ) : (
          <ul className="space-y-1.5">
            {feed.map((n) => (
              <li
                key={n.id}
                style={{
                  borderRadius: OBJ.radius,
                  border: `1px solid ${OBJ.line}`,
                  background: OBJ.surface2,
                  padding: "6px 10px",
                }}
              >
                <div
                  className="flex items-center gap-1.5"
                  style={{ fontSize: 10, textTransform: "uppercase", color: OBJ.inkSoft }}
                >
                  <FeedIcon type={n.note_type as "proof" | "resource" | "note"} />
                  {n.note_type}
                </div>
                <p style={{ fontSize: 14, lineHeight: 1.3, margin: "2px 0 0", color: OBJ.ink }}>
                  {n.title || "Untitled"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div style={{ borderTop: `1px solid ${OBJ.line}`, paddingTop: 12 }} className="space-y-2">
        <div className="flex flex-wrap gap-1.5">
          <AddTypeButton icon={<Paperclip size={11} />} label="Proof" />
          <AddTypeButton icon={<Link2 size={11} />} label="Resource" />
          <AddTypeButton icon={<StickyNote size={11} />} label="Note" />
        </div>
      </div>
    </div>
  );
}

function FilterPill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        borderRadius: 999,
        border: `1px solid ${active ? OBJ.accent : OBJ.line}`,
        padding: "2px 8px",
        fontSize: 10,
        textTransform: "capitalize",
        background: active ? OBJ.accent : "transparent",
        color: active ? "#fff" : OBJ.inkSoft,
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}

function FeedIcon({ type }: { type: "proof" | "resource" | "note" }) {
  if (type === "resource") return <ExternalLink size={11} />;
  if (type === "note") return <StickyNote size={11} />;
  return <FileText size={11} />;
}

function AddTypeButton({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <button
      type="button"
      disabled
      className="inline-flex items-center gap-1"
      style={{
        borderRadius: OBJ.radius,
        border: `1px solid ${OBJ.line}`,
        padding: "4px 8px",
        fontSize: 11,
        background: "none",
        color: OBJ.ink,
        cursor: "not-allowed",
        opacity: 0.55,
      }}
    >
      {icon} {label}
    </button>
  );
}
