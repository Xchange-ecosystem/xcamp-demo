import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/auth";
import {
  archiveNote,
  createNote,
  getLinkedNoteIds,
  listNotes,
  listProjects,
  updateNote,
} from "@/lib/xcamp-api";
import type { NoteRow } from "@/types/xcamp";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Xcamp Journal" },
      { name: "description", content: "Capture and manage your notes natively in the Xcamp ecosystem." },
    ],
  }),
  component: JournalApp,
});

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function previewText(note: NoteRow) {
  const raw = note.body_markdown ?? "";
  return raw.replace(/[#*`>_-]/g, "").trim().slice(0, 120);
}

type Editing = { mode: "new" } | { mode: "edit"; note: NoteRow } | null;

function JournalApp() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Editing>(null);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  const notesQuery = useQuery({
    queryKey: ["notes", user?.centralId],
    queryFn: () => listNotes(user!),
    enabled: !!user,
  });

  const projectsQuery = useQuery({
    queryKey: ["projects", user?.tenantId],
    queryFn: () => listProjects(user!),
    enabled: !!user,
  });

  const notes = notesQuery.data ?? [];

  const linkedQuery = useQuery({
    queryKey: ["linked", notes.map((n) => n.id).join(",")],
    queryFn: () => getLinkedNoteIds(notes.map((n) => n.id)),
    enabled: notes.length > 0,
  });
  const linked = linkedQuery.data ?? new Set<string>();

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["notes", user?.centralId] });

  const createMut = useMutation({
    mutationFn: (input: { title: string; bodyMarkdown: string; projectId?: string | null }) =>
      createNote(user!, input),
    onSuccess: () => {
      invalidate();
      setEditing(null);
    },
  });

  const updateMut = useMutation({
    mutationFn: (input: {
      noteId: string;
      title: string;
      bodyMarkdown: string;
      projectId?: string | null;
      existingDetail: Record<string, unknown>;
    }) => updateNote(user!, input.noteId, input),
    onSuccess: () => {
      invalidate();
      setEditing(null);
    },
  });

  const archiveMut = useMutation({
    mutationFn: (note: NoteRow) => archiveNote(user!, note),
    onSuccess: () => {
      invalidate();
      setEditing(null);
    },
  });

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ color: "var(--skin-ink-soft)" }}>
        Loading…
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--skin-bg)", display: "grid", gridTemplateColumns: "300px 1fr" }}>
      {/* Sidebar */}
      <aside
        style={{
          background: "var(--skin-surface)",
          borderRight: "1px solid var(--skin-line)",
          padding: "20px 16px",
          display: "flex",
          flexDirection: "column",
          height: "100vh",
          position: "sticky",
          top: 0,
        }}
      >
        <div className="mb-4 flex items-center gap-2">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-md text-sm font-semibold"
            style={{ background: "var(--skin-accent)", color: "#fff" }}
          >
            J
          </div>
          <div className="font-semibold" style={{ color: "var(--skin-ink)", fontSize: 15 }}>
            Xcamp Journal
          </div>
        </div>

        <button className="x-btn-primary mb-4" onClick={() => setEditing({ mode: "new" })}>
          + New note
        </button>

        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
          {notesQuery.isLoading && <p style={{ color: "var(--skin-ink-faint)", fontSize: 13 }}>Loading notes…</p>}
          {!notesQuery.isLoading && notes.length === 0 && (
            <p style={{ color: "var(--skin-ink-faint)", fontSize: 13 }}>No notes yet. Create your first one.</p>
          )}
          {notes.map((note) => {
            const active = editing?.mode === "edit" && editing.note.id === note.id;
            return (
              <div
                key={note.id}
                className="x-note-card"
                data-active={active}
                onClick={() => setEditing({ mode: "edit", note })}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="x-note-card__title" style={{ fontSize: 14, fontWeight: 600, color: "var(--skin-ink)" }}>
                    {note.title || "Untitled"}
                  </div>
                  {linked.has(note.id) && <span className="x-badge-linked">linked</span>}
                </div>
                <div style={{ fontSize: 12, color: "var(--skin-ink-faint)", marginTop: 4 }}>
                  {formatDate(note.updated_at || note.created_at)}
                </div>
                {previewText(note) && (
                  <div style={{ fontSize: 13, color: "var(--skin-ink-soft)", marginTop: 8, lineHeight: 1.5 }}>
                    {previewText(note)}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-4 border-t pt-3" style={{ borderColor: "var(--skin-line)" }}>
          <div style={{ fontSize: 12, color: "var(--skin-ink-soft)" }}>{user.displayName}</div>
          <button
            className="mt-1 text-xs"
            style={{ color: "var(--skin-accent)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
            onClick={() => signOut()}
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ padding: 32, maxWidth: 820, width: "100%" }}>
        {editing ? (
          <NoteEditor
            key={editing.mode === "edit" ? editing.note.id : "new"}
            editing={editing}
            projects={projectsQuery.data ?? []}
            saving={createMut.isPending || updateMut.isPending}
            archiving={archiveMut.isPending}
            onCancel={() => setEditing(null)}
            onSave={(values) => {
              if (editing.mode === "new") {
                createMut.mutate(values);
              } else {
                updateMut.mutate({
                  noteId: editing.note.id,
                  ...values,
                  existingDetail: editing.note.detail,
                });
              }
            }}
            onArchive={editing.mode === "edit" ? () => archiveMut.mutate(editing.note) : undefined}
          />
        ) : (
          <div
            className="flex h-full items-center justify-center text-center"
            style={{ color: "var(--skin-ink-faint)", minHeight: 300 }}
          >
            <div>
              <p style={{ fontSize: 15, color: "var(--skin-ink-soft)" }}>Select a note or create a new one.</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function NoteEditor({
  editing,
  projects,
  saving,
  archiving,
  onSave,
  onCancel,
  onArchive,
}: {
  editing: Exclude<Editing, null>;
  projects: { id: string; name: string }[];
  saving: boolean;
  archiving: boolean;
  onSave: (v: { title: string; bodyMarkdown: string; projectId?: string | null }) => void;
  onCancel: () => void;
  onArchive?: () => void;
}) {
  const initial = editing.mode === "edit" ? editing.note : null;
  const [title, setTitle] = useState(initial?.title ?? "");
  const [body, setBody] = useState(initial?.body_markdown ?? "");
  const [projectId, setProjectId] = useState<string>(
    (initial?.detail?.project_id as string | undefined) ?? "",
  );

  const canSave = useMemo(() => title.trim().length > 0, [title]);

  return (
    <div className="x-editor">
      <div className="mb-4 flex items-center justify-between gap-3">
        <span style={{ fontSize: 12, fontWeight: 500, color: "var(--skin-ink-faint)" }}>
          {editing.mode === "new" ? "New note" : "Editing note"}
        </span>
        <div className="flex items-center gap-2">
          {onArchive && (
            <button
              className="x-btn-secondary"
              style={{ color: "var(--danger)", borderColor: "var(--skin-line)" }}
              onClick={onArchive}
              disabled={archiving}
            >
              {archiving ? "Archiving…" : "Archive"}
            </button>
          )}
          <button className="x-btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button className="x-btn-primary" onClick={() => onSave({ title: title.trim(), bodyMarkdown: body, projectId: projectId || null })} disabled={!canSave || saving}>
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      <input
        className="x-input"
        style={{ fontSize: 22, fontWeight: 600, border: "none", background: "transparent", padding: 0, marginBottom: 16 }}
        placeholder="Note title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />

      <div className="mb-4" style={{ maxWidth: 280 }}>
        <label className="mb-1 block text-xs font-medium" style={{ color: "var(--skin-ink-soft)" }}>
          Project (optional)
        </label>
        <select className="x-input" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
          <option value="">No project</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      <textarea
        className="x-input"
        style={{ minHeight: 320, lineHeight: 1.7, fontSize: 15, resize: "vertical", fontFamily: "inherit" }}
        placeholder="Write your note in markdown…"
        value={body}
        onChange={(e) => setBody(e.target.value)}
      />
    </div>
  );
}
