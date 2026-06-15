import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Search, CheckSquare, Square, Trash2, FolderInput, X } from "lucide-react";
import { useAuth } from "@/contexts/auth";
import {
  archiveNote,
  bulkArchive,
  bulkAssignProject,
  createNote,
  getLinkedNoteIds,
  listNotes,
  listProjects,
  updateNote,
} from "@/lib/xcamp-api";
import { NoteEditor, type Editing, type NoteEditorValues } from "@/components/editor/NoteEditor";
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
  const raw = note.body_html ?? note.body_markdown ?? "";
  return raw.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 110);
}

type SortKey = "updated" | "created" | "title";

function JournalApp() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Editing | null>(null);

  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("updated");
  const [filterProject, setFilterProject] = useState("");
  const [filterTag, setFilterTag] = useState("");
  const [filterLinked, setFilterLinked] = useState(false);

  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

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
  const projects = projectsQuery.data ?? [];

  const linkedQuery = useQuery({
    queryKey: ["linked", notes.map((n) => n.id).join(",")],
    queryFn: () => getLinkedNoteIds(notes.map((n) => n.id)),
    enabled: notes.length > 0,
  });
  const linked = linkedQuery.data ?? new Set<string>();

  const projectName = (id?: string) => projects.find((p) => p.id === id)?.name;
  const allTags = useMemo(
    () => Array.from(new Set(notes.flatMap((n) => n.tags))).sort(),
    [notes],
  );

  const visibleNotes = useMemo(() => {
    let list = notes.slice();
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          (n.body_html ?? "").toLowerCase().includes(q) ||
          n.tags.some((t) => t.includes(q)),
      );
    }
    if (filterProject) list = list.filter((n) => n.detail?.project_id === filterProject);
    if (filterTag) list = list.filter((n) => n.tags.includes(filterTag));
    if (filterLinked) list = list.filter((n) => linked.has(n.id));
    list.sort((a, b) => {
      if (sort === "title") return a.title.localeCompare(b.title);
      const key = sort === "created" ? "created_at" : "updated_at";
      return new Date(b[key] || b.created_at).getTime() - new Date(a[key] || a.created_at).getTime();
    });
    return list;
  }, [notes, search, filterProject, filterTag, filterLinked, linked, sort]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["notes", user?.centralId] });
    queryClient.invalidateQueries({ queryKey: ["linked"] });
  };

  const createMut = useMutation({
    mutationFn: (input: NoteEditorValues) => createNote(user!, input),
    onSuccess: () => {
      invalidate();
      setEditing(null);
    },
  });

  const updateMut = useMutation({
    mutationFn: (input: { noteId: string; values: NoteEditorValues; existingDetail: Record<string, unknown> }) =>
      updateNote(user!, input.noteId, { ...input.values, existingDetail: input.existingDetail }),
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

  const bulkArchiveMut = useMutation({
    mutationFn: (ids: Set<string>) => bulkArchive(user!, notes.filter((n) => ids.has(n.id))),
    onSuccess: () => {
      invalidate();
      setSelected(new Set());
      setSelectMode(false);
    },
  });

  const bulkAssignMut = useMutation({
    mutationFn: (input: { ids: Set<string>; projectId: string | null }) =>
      bulkAssignProject(user!, notes.filter((n) => input.ids.has(n.id)), input.projectId),
    onSuccess: () => {
      invalidate();
      setSelected(new Set());
      setSelectMode(false);
    },
  });

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ color: "var(--skin-ink-soft)" }}>
        Loading…
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--skin-bg)", display: "grid", gridTemplateColumns: "340px 1fr" }}>
      {/* Sidebar / history */}
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

        <button className="x-btn-primary mb-3" onClick={() => { setEditing({ mode: "new" }); }}>
          + New note
        </button>

        {/* Search */}
        <div style={{ position: "relative", marginBottom: 10 }}>
          <Search size={14} style={{ position: "absolute", left: 10, top: 9, color: "var(--skin-ink-faint)" }} />
          <input
            className="x-input"
            style={{ paddingLeft: 30, height: 32, fontSize: 13 }}
            placeholder="Search notes…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Sort + filters */}
        <div className="mb-2 grid grid-cols-2 gap-2">
          <select className="x-input" style={{ height: 32, fontSize: 12 }} value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
            <option value="updated">Sort: Updated</option>
            <option value="created">Sort: Created</option>
            <option value="title">Sort: Title</option>
          </select>
          <select className="x-input" style={{ height: 32, fontSize: 12 }} value={filterProject} onChange={(e) => setFilterProject(e.target.value)}>
            <option value="">All projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <select className="x-input" style={{ height: 32, fontSize: 12 }} value={filterTag} onChange={(e) => setFilterTag(e.target.value)}>
            <option value="">All tags</option>
            {allTags.map((t) => (
              <option key={t} value={t}>
                #{t}
              </option>
            ))}
          </select>
          <button
            className="x-btn-secondary"
            style={{ height: 32, fontSize: 12, padding: "0 8px", borderColor: filterLinked ? "var(--skin-accent)" : "var(--skin-line)", color: filterLinked ? "var(--skin-accent)" : "var(--skin-ink)" }}
            onClick={() => setFilterLinked((v) => !v)}
          >
            {filterLinked ? "✓ Linked only" : "Linked only"}
          </button>
        </div>

        {/* Select toolbar */}
        <div className="mb-2 flex items-center justify-between">
          <button
            className="text-xs"
            style={{ color: "var(--skin-accent)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
            onClick={() => {
              setSelectMode((v) => !v);
              setSelected(new Set());
            }}
          >
            {selectMode ? "Cancel selection" : "Select"}
          </button>
          <span style={{ fontSize: 11, color: "var(--skin-ink-faint)" }}>{visibleNotes.length} notes</span>
        </div>

        {selectMode && selected.size > 0 && (
          <div className="mb-2 flex flex-wrap items-center gap-2 rounded-md p-2" style={{ background: "var(--skin-surface2)" }}>
            <span style={{ fontSize: 12, fontWeight: 500 }}>{selected.size} selected</span>
            <button
              className="x-btn-secondary"
              style={{ height: 28, fontSize: 12, color: "var(--danger)" }}
              onClick={() => {
                if (confirm(`Delete ${selected.size} note(s)?`)) bulkArchiveMut.mutate(selected);
              }}
              disabled={bulkArchiveMut.isPending}
            >
              <Trash2 size={13} style={{ display: "inline", marginRight: 4 }} />
              Delete
            </button>
            <select
              className="x-input"
              style={{ height: 28, fontSize: 12, width: "auto" }}
              value=""
              onChange={(e) => {
                bulkAssignMut.mutate({ ids: selected, projectId: e.target.value || null });
              }}
            >
              <option value="">Assign to project…</option>
              <option value="__none">— No project —</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
          {notesQuery.isLoading && <p style={{ color: "var(--skin-ink-faint)", fontSize: 13 }}>Loading notes…</p>}
          {!notesQuery.isLoading && visibleNotes.length === 0 && (
            <p style={{ color: "var(--skin-ink-faint)", fontSize: 13 }}>No notes match.</p>
          )}
          {visibleNotes.map((note) => {
            const active = editing?.mode === "edit" && editing.note.id === note.id;
            const isSel = selected.has(note.id);
            return (
              <div
                key={note.id}
                className="x-note-card"
                data-active={active}
                onClick={() => (selectMode ? toggleSelect(note.id) : setEditing({ mode: "edit", note }))}
              >
                <div className="flex items-start gap-2">
                  {selectMode && (
                    <span style={{ color: isSel ? "var(--skin-accent)" : "var(--skin-ink-faint)", marginTop: 2 }}>
                      {isSel ? <CheckSquare size={16} /> : <Square size={16} />}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="x-note-card__title" style={{ fontSize: 14, fontWeight: 600, color: "var(--skin-ink)" }}>
                        {note.title || "Untitled"}
                      </div>
                      {linked.has(note.id) && <span className="x-badge-linked">linked</span>}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--skin-ink-faint)", marginTop: 4 }}>
                      {formatDate(note.updated_at || note.created_at)}
                      {projectName(note.detail?.project_id as string) && ` · ${projectName(note.detail?.project_id as string)}`}
                    </div>
                    {previewText(note) && (
                      <div style={{ fontSize: 13, color: "var(--skin-ink-soft)", marginTop: 8, lineHeight: 1.5 }}>
                        {previewText(note)}
                      </div>
                    )}
                    {note.tags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {note.tags.map((t) => (
                          <span key={t} className="x-tag x-tag--sm">
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
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
      <main style={{ padding: 32, width: "100%" }}>
        {editing ? (
          <NoteEditor
            key={editing.mode === "edit" ? editing.note.id : "new"}
            editing={editing}
            projects={projects}
            saving={createMut.isPending || updateMut.isPending}
            archiving={archiveMut.isPending}
            onCancel={() => setEditing(null)}
            onSave={(values) => {
              if (editing.mode === "new") {
                createMut.mutate(values);
              } else {
                updateMut.mutate({ noteId: editing.note.id, values, existingDetail: editing.note.detail });
              }
            }}
            onArchive={editing.mode === "edit" ? () => archiveMut.mutate(editing.note) : undefined}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-center" style={{ color: "var(--skin-ink-faint)", minHeight: 300 }}>
            <div>
              <p style={{ fontSize: 15, color: "var(--skin-ink-soft)" }}>Select a note or create a new one.</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
