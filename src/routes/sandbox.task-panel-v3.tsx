// ─────────────────────────────────────────────────────────────────────────
// THROWAWAY SANDBOX — not a real app surface. Not linked from any nav.
//
// Reproduces xcamp-foundation's "v3" task-detail surface as faithfully as
// practical: DocumentStep.tsx's two-column layout + its inline TaskDetail
// (xcamp-foundation/src/features/objective-detail/steps/DocumentStep.tsx,
// lines 1–188), plus TaskReferencesPanel and MarkdownEditor. Re-implemented
// from a read-only reference read of xcamp-foundation — nothing imported
// from that repo.
//
// Colors/radii below are xcamp-foundation's own literal design tokens
// (light theme, default "scientific" skin — see its src/styles/tokens.css),
// hardcoded on purpose rather than reusing nox's Tailwind color utilities,
// which resolve to a different palette. Layout-only Tailwind utilities
// (flex/grid/gap/padding/text-size) are still used freely.
//
// Real data: dev tenant 30a00e60-7cae-4a5e-a311-b3be998e7113, objective
// "Hey ho lets go". Requires the signed-in user to have RLS access to that
// objective (e.g. dev-superadmin@xcamp.local) — same as any other objective
// view in the app. Only the "done" toggle writes to the DB; everything else
// is interactive but non-persisting.
// ─────────────────────────────────────────────────────────────────────────
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import {
  CheckCircle2,
  Circle,
  Plus,
  ChevronRight,
  MoreVertical,
  Bold,
  Italic,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  Code,
  Link as LinkIcon,
  Eye,
  Pencil,
  Paperclip,
  Link2,
  FileText,
  ExternalLink,
  Upload,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { SandboxBanner } from "@/components/sandbox/SandboxBanner";

export const Route = createFileRoute("/sandbox/task-panel-v3")({
  head: () => ({ meta: [{ title: "Sandbox — Task Panel v3" }] }),
  component: SandboxTaskPanelV3,
});

const FND = {
  bg: "hsl(0 0% 97%)",
  ink: "hsl(220 13% 10%)",
  card: "hsl(0 0% 100%)",
  border: "hsl(220 13% 91%)",
  input: "hsl(220 13% 91%)",
  mutedInk: "hsl(220 9% 46%)",
  primary: "hsl(168 72% 48%)",
  primarySoft: "hsl(168 72% 42% / 0.06)",
};

// "Hey ho lets go" objective, dev tenant 30a00e60-7cae-4a5e-a311-b3be998e7113.
const OBJECTIVE_ID = "7eb9d60e-6f1d-4552-a68a-175db329d183";
// "Hiphop" task — has a real attachment, so TaskReferencesPanel has something to show.
const DEFAULT_TASK_ID = "8b27891d-cf5c-455b-bdec-7d021f97badc";

type TaskNote = {
  id: string;
  title: string;
  done: boolean;
  body_markdown: string | null;
};

type RefItem = {
  id: string;
  file_name?: string;
  label?: string | null;
  object_path?: string;
  size_bytes?: number | null;
  url: string | null;
};

type NoteLink = { id: string; title: string; note_type: string };

type TaskReferences = { attachments: RefItem[]; links: RefItem[]; notes: NoteLink[] };

async function fetchTasks(objectiveId: string): Promise<TaskNote[]> {
  const { data, error } = await supabase
    .from("objective_notes")
    .select("note:notes(id, title, done, body_markdown, note_type)")
    .eq("objective_id", objectiveId);
  if (error || !data) return [];
  return (data as unknown as Array<{ note: TaskNote & { note_type: string } }>)
    .map((r) => r.note)
    .filter((n) => !!n && n.note_type === "task");
}

async function fetchTaskReferences(taskId: string): Promise<TaskReferences> {
  const linksRes = await supabase
    .from("attachment_links")
    .select(
      "id, label, attachments!inner(bucket_id, object_path, file_name, mime_type, size_bytes)",
    )
    .eq("entity_table", "notes")
    .eq("entity_id", taskId);

  const attachments: RefItem[] = [];
  const links: RefItem[] = [];
  if (!linksRes.error && linksRes.data) {
    for (const row of linksRes.data as unknown as Array<{
      id: string;
      label: string | null;
      attachments:
        | {
            bucket_id: string;
            object_path: string;
            file_name: string;
            mime_type: string | null;
            size_bytes: number | null;
          }
        | Array<{
            bucket_id: string;
            object_path: string;
            file_name: string;
            mime_type: string | null;
            size_bytes: number | null;
          }>;
    }>) {
      const a = Array.isArray(row.attachments) ? row.attachments[0] : row.attachments;
      if (!a) continue;
      const isLink = a.mime_type === "text/uri-list";
      let url: string | null = null;
      if (isLink) {
        url = a.object_path;
      } else {
        const signed = await supabase.storage
          .from(a.bucket_id)
          .createSignedUrl(a.object_path, 3600);
        url = signed.data?.signedUrl ?? null;
      }
      const item: RefItem = {
        id: row.id,
        file_name: a.file_name,
        label: row.label,
        object_path: a.object_path,
        size_bytes: a.size_bytes,
        url,
      };
      (isLink ? links : attachments).push(item);
    }
  }

  const notes: NoteLink[] = [];
  const linksFrom = await supabase
    .from("note_links")
    .select("id, to_note_id")
    .eq("from_note_id", taskId);
  if (!linksFrom.error && linksFrom.data?.length) {
    const targetIds = linksFrom.data.map((r) => r.to_note_id);
    const noteRows = await supabase
      .from("notes")
      .select("id, title, note_type")
      .in("id", targetIds);
    if (!noteRows.error && noteRows.data) {
      const byId = new Map(noteRows.data.map((n) => [n.id, n]));
      for (const link of linksFrom.data) {
        const n = byId.get(link.to_note_id);
        if (n) notes.push({ id: link.id, title: n.title, note_type: n.note_type });
      }
    }
  }

  return { attachments, links, notes };
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function SandboxTaskPanelV3() {
  const qc = useQueryClient();
  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["sandbox-v3-tasks", OBJECTIVE_ID],
    queryFn: () => fetchTasks(OBJECTIVE_ID),
  });
  const [selectedId, setSelectedId] = useState<string | null>(DEFAULT_TASK_ID);
  const selected = tasks.find((t) => t.id === selectedId) ?? tasks[0] ?? null;

  const toggleDone = async (t: TaskNote, e: React.MouseEvent) => {
    e.stopPropagation();
    await supabase.from("notes").update({ done: !t.done }).eq("id", t.id);
    qc.invalidateQueries({ queryKey: ["sandbox-v3-tasks", OBJECTIVE_ID] });
  };

  return (
    <div style={{ minHeight: "100vh", background: FND.bg, color: FND.ink }}>
      <SandboxBanner
        label="xcamp-foundation — v3 (objective-detail / DocumentStep.tsx)"
        note='Real data from the "Hey ho lets go" objective in the shared dev tenant. Empty if you are not signed in as a project member (e.g. dev-superadmin@xcamp.local).'
      />
      <div
        className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]"
        style={{ maxWidth: 1100, margin: "20px auto 40px", padding: "0 20px" }}
      >
        <section
          style={{
            borderRadius: 7,
            border: `1px solid ${FND.border}`,
            background: FND.card,
            padding: 12,
          }}
        >
          <header className="mb-2 flex items-center justify-between">
            <h2 style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>Tasks</h2>
            <button
              disabled
              className="inline-flex items-center gap-1"
              style={{
                borderRadius: 5,
                border: `1px dashed ${FND.border}`,
                padding: "4px 8px",
                fontSize: 12,
                background: "none",
                color: FND.ink,
                cursor: "not-allowed",
                opacity: 0.55,
              }}
            >
              <Plus size={12} /> Add task
            </button>
          </header>
          {isLoading && <p style={{ fontSize: 13, color: FND.mutedInk }}>Loading…</p>}
          <ul className="space-y-1.5" style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {!isLoading && tasks.length === 0 && (
              <li
                style={{
                  borderRadius: 5,
                  border: `1px dashed ${FND.border}`,
                  padding: "16px 12px",
                  textAlign: "center",
                  fontSize: 13,
                  color: FND.mutedInk,
                }}
              >
                No tasks yet.
              </li>
            )}
            {tasks.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(t.id)}
                  className="flex w-full items-center gap-2"
                  style={{
                    textAlign: "left",
                    cursor: "pointer",
                    borderRadius: 5,
                    padding: "8px 10px",
                    border: `1px solid ${selected?.id === t.id ? FND.primary : FND.border}`,
                    background: selected?.id === t.id ? FND.primarySoft : FND.card,
                  }}
                >
                  <span
                    onClick={(e) => toggleDone(t, e)}
                    role="button"
                    aria-label={t.done ? "Mark not done" : "Mark done"}
                    style={{ display: "flex", cursor: "pointer", color: FND.primary }}
                  >
                    {t.done ? (
                      <CheckCircle2 size={16} />
                    ) : (
                      <Circle size={16} color={FND.mutedInk} />
                    )}
                  </span>
                  <span
                    className="flex-1 truncate"
                    style={{
                      fontSize: 14,
                      textDecoration: t.done ? "line-through" : "none",
                      color: t.done ? FND.mutedInk : FND.ink,
                    }}
                  >
                    {t.title}
                  </span>
                  <span style={{ fontSize: 10, color: FND.mutedInk }}>0 contrib</span>
                  <ChevronRight size={14} color={FND.mutedInk} />
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section
          style={{
            borderRadius: 7,
            border: `1px solid ${FND.border}`,
            background: FND.card,
            padding: 16,
          }}
        >
          {!selected ? (
            <div
              style={{ padding: "40px 0", textAlign: "center", fontSize: 13, color: FND.mutedInk }}
            >
              Select a task to edit.
            </div>
          ) : (
            <TaskDetail key={selected.id} task={selected} />
          )}
        </section>
      </div>
    </div>
  );
}

function TaskDetail({ task }: { task: TaskNote }) {
  const [title, setTitle] = useState(task.title);
  const [body, setBody] = useState(task.body_markdown ?? "");
  const [mode, setMode] = useState<"edit" | "preview">("edit");

  const { data: refs, isLoading: refsLoading } = useQuery({
    queryKey: ["sandbox-v3-refs", task.id],
    queryFn: () => fetchTaskReferences(task.id),
  });
  const attachments = refs?.attachments ?? [];
  const links = refs?.links ?? [];
  const notes = refs?.notes ?? [];
  const empty =
    !refsLoading && attachments.length === 0 && links.length === 0 && notes.length === 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={{
            flex: 1,
            borderRadius: 5,
            border: `1px solid ${FND.input}`,
            background: FND.bg,
            padding: "6px 10px",
            fontSize: 14,
            fontWeight: 500,
            color: FND.ink,
          }}
        />
        <button
          disabled
          aria-label="Delete task"
          style={{
            background: "none",
            border: "none",
            display: "flex",
            color: FND.mutedInk,
            cursor: "not-allowed",
            opacity: 0.55,
          }}
        >
          <MoreVertical size={16} />
        </button>
      </div>

      <label className="block space-y-1">
        <span style={{ display: "block", fontSize: 11, fontWeight: 500, color: FND.mutedInk }}>
          Description (Goal · Definition of Done)
        </span>
        <div style={{ borderRadius: 5, border: `1px solid ${FND.input}`, background: FND.bg }}>
          <div
            className="flex items-center justify-between gap-1"
            style={{ borderBottom: `1px solid ${FND.border}`, padding: "4px 6px" }}
          >
            <div className="flex flex-wrap items-center gap-0.5">
              <ToolBtn>
                <Bold size={14} />
              </ToolBtn>
              <ToolBtn>
                <Italic size={14} />
              </ToolBtn>
              <ToolBtn>
                <Heading1 size={14} />
              </ToolBtn>
              <ToolBtn>
                <Heading2 size={14} />
              </ToolBtn>
              <ToolBtn>
                <List size={14} />
              </ToolBtn>
              <ToolBtn>
                <ListOrdered size={14} />
              </ToolBtn>
              <ToolBtn>
                <Code size={14} />
              </ToolBtn>
              <ToolBtn>
                <LinkIcon size={14} />
              </ToolBtn>
            </div>
            <div className="flex items-center gap-0.5">
              <ToolBtn active={mode === "edit"} onClick={() => setMode("edit")}>
                <Pencil size={14} />
              </ToolBtn>
              <ToolBtn active={mode === "preview"} onClick={() => setMode("preview")}>
                <Eye size={14} />
              </ToolBtn>
            </div>
          </div>
          {mode === "edit" ? (
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={6}
              placeholder="Write in markdown…"
              style={{
                display: "block",
                width: "100%",
                resize: "vertical",
                background: "transparent",
                border: "none",
                outline: "none",
                padding: "8px 10px",
                fontFamily: "ui-monospace, monospace",
                fontSize: 13,
                color: FND.ink,
              }}
            />
          ) : (
            <div
              className="prose prose-sm max-w-none"
              style={{ padding: "8px 10px", minHeight: 96 }}
            >
              {body.trim() ? (
                <ReactMarkdown>{body}</ReactMarkdown>
              ) : (
                <p style={{ color: FND.mutedInk }}>Nothing to preview.</p>
              )}
            </div>
          )}
        </div>
      </label>

      <div style={{ borderRadius: 5, border: `1px dashed ${FND.border}`, padding: 12 }}>
        <div className="flex items-center justify-between">
          <div style={{ fontSize: 12, fontWeight: 500, color: FND.mutedInk }}>
            Notes · proofs · references
          </div>
          <div className="flex items-center gap-1">
            <button disabled className="inline-flex items-center gap-1" style={pillBtnStyle}>
              <Paperclip size={12} /> Attach
            </button>
            <button disabled className="inline-flex items-center gap-1" style={pillBtnStyle}>
              <Link2 size={12} /> Link
            </button>
          </div>
        </div>

        {empty && (
          <div
            className="flex flex-col items-center gap-1"
            style={{
              marginTop: 12,
              padding: "16px 0",
              textAlign: "center",
              fontSize: 12,
              color: FND.mutedInk,
            }}
          >
            <Upload size={16} />
            Drag &amp; drop files here, or use Attach / Link.
          </div>
        )}
        {refsLoading && <p style={{ marginTop: 8, fontSize: 12, color: FND.mutedInk }}>Loading…</p>}

        {attachments.length > 0 && (
          <RefSection title="Attachments">
            {attachments.map((a) => (
              <div key={a.id} style={refRowStyle}>
                <a
                  href={a.url ?? "#"}
                  target="_blank"
                  rel="noreferrer"
                  className="flex min-w-0 items-center gap-2"
                  style={{ color: FND.ink, textDecoration: "none" }}
                >
                  <Paperclip size={13} color={FND.mutedInk} />
                  <span className="truncate">{a.file_name}</span>
                  {a.size_bytes != null && (
                    <span style={{ fontSize: 10, color: FND.mutedInk }}>
                      {formatBytes(a.size_bytes)}
                    </span>
                  )}
                </a>
              </div>
            ))}
          </RefSection>
        )}

        {links.length > 0 && (
          <RefSection title="Links">
            {links.map((a) => (
              <div key={a.id} style={refRowStyle}>
                <a
                  href={a.url ?? a.object_path}
                  target="_blank"
                  rel="noreferrer"
                  className="flex min-w-0 items-center gap-2"
                  style={{ color: FND.ink, textDecoration: "none" }}
                >
                  <ExternalLink size={13} color={FND.mutedInk} />
                  <span className="truncate">{a.label || a.object_path}</span>
                </a>
              </div>
            ))}
          </RefSection>
        )}

        {notes.length > 0 && (
          <RefSection title="Linked notes">
            {notes.map((n) => (
              <div key={n.id} className="flex items-center gap-2" style={refRowStyle}>
                <FileText size={13} color={FND.mutedInk} />
                <span className="truncate">{n.title}</span>
                <span style={{ fontSize: 10, textTransform: "uppercase", color: FND.mutedInk }}>
                  {n.note_type}
                </span>
              </div>
            ))}
          </RefSection>
        )}
      </div>
    </div>
  );
}

const refRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  borderRadius: 5,
  border: `1px solid ${FND.border}`,
  background: FND.card,
  padding: "6px 8px",
  fontSize: 12,
};

const pillBtnStyle: React.CSSProperties = {
  borderRadius: 5,
  border: `1px solid ${FND.border}`,
  padding: "4px 8px",
  fontSize: 12,
  background: "none",
  color: FND.ink,
  cursor: "not-allowed",
  opacity: 0.55,
};

function RefSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 12 }}>
      <div
        style={{
          marginBottom: 4,
          fontSize: 10,
          fontWeight: 500,
          textTransform: "uppercase",
          letterSpacing: "0.04em",
          color: FND.mutedInk,
        }}
      >
        {title}
      </div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function ToolBtn({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        height: 26,
        width: 26,
        borderRadius: 4,
        border: "none",
        background: active ? FND.bg : "transparent",
        color: onClick ? FND.ink : FND.mutedInk,
        cursor: onClick ? "pointer" : "default",
      }}
    >
      {children}
    </button>
  );
}
