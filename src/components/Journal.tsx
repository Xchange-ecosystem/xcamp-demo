import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Search,
  CheckSquare,
  Square,
  Trash2,
  X,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  SlidersHorizontal,
  Check,
  Link2,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/contexts/auth";
import { useBrand } from "@/lib/brand";
import { useIsMobile } from "@/hooks/use-mobile";
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
import { OrganiseSheet } from "@/components/organiser/OrganiseSheet";
import { noteToIntent } from "@/lib/organiser-api";
import type { NoteRow } from "@/types/xcamp";

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

function FilterChip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <span
      style={{
        display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, padding: "3px 4px 3px 9px",
        borderRadius: 999, background: "var(--skin-surface2)", color: "var(--skin-ink)", border: "1px solid var(--skin-line)",
      }}
    >
      {label}
      <button
        onClick={onClear}
        aria-label={`Remove ${label}`}
        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--skin-ink-faint)", padding: 0, lineHeight: 0 }}
      >
        <X size={12} />
      </button>
    </span>
  );
}

type SortKey = "updated" | "created" | "title";
type SortDir = "asc" | "desc";

const SORT_LABELS: Record<SortKey, string> = {
  updated: "Last updated",
  created: "Date created",
  title: "Title",
};

export function Journal({
  embedded = false,
  defaultCollapsed = false,
  draft = null,
}: {
  embedded?: boolean;
  defaultCollapsed?: boolean;
  draft?: { body: string; key: number } | null;
}) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const brand = useBrand();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const [editing, setEditing] = useState<Editing | null>(null);
  const [organising, setOrganising] = useState<NoteRow | null>(null);

  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  useEffect(() => {
    if (!draft) return;
    setEditing({ mode: "new", initialBody: draft.body });
    setCollapsed(false);
  }, [draft]);



  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("updated");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [filterProject, setFilterProject] = useState("");
  const [filterTags, setFilterTags] = useState<string[]>([]);
  const [filterLinked, setFilterLinked] = useState(false);

  const [sortOpen, setSortOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);
  const filtersRef = useRef<HTMLDivElement>(null);

  const activeFilterCount =
    (filterProject ? 1 : 0) + filterTags.length + (filterLinked ? 1 : 0);

  const toggleTag = (tag: string) =>
    setFilterTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );

  const clearAllFilters = () => {
    setFilterProject("");
    setFilterTags([]);
    setFilterLinked(false);
  };

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setSortOpen(false);
      if (filtersRef.current && !filtersRef.current.contains(e.target as Node)) setFiltersOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

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
    if (filterTags.length) list = list.filter((n) => filterTags.some((t) => n.tags.includes(t)));
    if (filterLinked) list = list.filter((n) => linked.has(n.id));
    const dir = sortDir === "asc" ? -1 : 1;
    list.sort((a, b) => {
      if (sort === "title") return a.title.localeCompare(b.title) * (sortDir === "asc" ? 1 : -1);
      const key = sort === "created" ? "created_at" : "updated_at";
      return (new Date(b[key] || b.created_at).getTime() - new Date(a[key] || a.created_at).getTime()) * dir;
    });
    return list;
  }, [notes, search, filterProject, filterTags, filterLinked, linked, sort, sortDir]);

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
      <div
        className="flex items-center justify-center"
        style={{ color: "var(--skin-ink-soft)", height: embedded ? "60vh" : "100vh" }}
      >
        Loading…
      </div>
    );
  }

  const effCollapsed = isMobile ? false : collapsed;
  const sidebarWidth = effCollapsed ? 56 : 340;
  const containerHeight = embedded ? (isMobile ? "auto" : "70vh") : "100vh";
  const asidePosition = embedded ? "relative" : "sticky";

  // On mobile we render a single column: the list, or the editor when one is open.
  const showList = !isMobile || !editing;
  const showMain = !isMobile || !!editing;

  return (
    <div
      style={{
        background: "var(--skin-bg)",
        display: isMobile ? "flex" : "grid",
        flexDirection: isMobile ? "column" : undefined,
        gridTemplateColumns: isMobile ? undefined : `${sidebarWidth}px 1fr`,
        height: containerHeight,
        minHeight: isMobile && embedded ? "70vh" : undefined,
        borderRadius: embedded ? 16 : 0,
        overflow: "hidden",
      }}
    >
      {/* Sidebar / history */}
      {showList && (
      <aside
        style={{
          background: "var(--skin-surface)",
          borderRight: isMobile ? "none" : "1px solid var(--skin-line)",
          padding: effCollapsed ? "16px 8px" : isMobile ? "14px 12px" : "20px 16px",
          display: "flex",
          flexDirection: "column",
          height: isMobile ? "auto" : "100%",
          flex: isMobile ? 1 : undefined,
          minHeight: isMobile && embedded ? "70vh" : undefined,
          position: isMobile ? "relative" : asidePosition,
          top: 0,
          overflow: "hidden",
        }}
      >
        {effCollapsed ? (
          <div className="flex flex-col items-center gap-3">
            <button
              className="x-btn-secondary"
              aria-label="Expand sidebar"
              title="Expand sidebar"
              style={{ height: 36, width: 36, padding: 0, display: "flex", alignItems: "center", justifyContent: "center" }}
              onClick={() => setCollapsed(false)}
            >
              <PanelLeftOpen size={16} />
            </button>
            <button
              className="x-btn-primary"
              aria-label="New note"
              title="New note"
              style={{ height: 36, width: 36, padding: 0, display: "flex", alignItems: "center", justifyContent: "center" }}
              onClick={() => { setEditing({ mode: "new" }); setCollapsed(false); }}
            >
              <Plus size={16} />
            </button>
          </div>
        ) : (
          <>
            <div className="mb-4 flex items-center justify-between gap-2">
              <div className="font-semibold" style={{ color: "var(--skin-ink)", fontSize: 15 }}>
                Notes
              </div>
              {!isMobile && (
                <button
                  className="x-btn-secondary"
                  aria-label="Collapse sidebar"
                  title="Collapse sidebar"
                  style={{ height: 30, width: 30, padding: 0, display: "flex", alignItems: "center", justifyContent: "center" }}
                  onClick={() => setCollapsed(true)}
                >
                  <PanelLeftClose size={15} />
                </button>
              )}
            </div>

            <button className="x-btn-primary mb-3" onClick={() => { setEditing({ mode: "new" }); }}>
              + New note
            </button>

            {/* Search + sort */}
            <div className="mb-2 flex items-center gap-2">
              <div style={{ position: "relative", flex: 1 }}>
                <Search size={14} style={{ position: "absolute", left: 10, top: 9, color: "var(--skin-ink-faint)" }} />
                <input
                  className="x-input"
                  style={{ paddingLeft: 30, paddingRight: search ? 28 : 10, height: 32, fontSize: 13, width: "100%" }}
                  placeholder="Search notes…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                  <button
                    aria-label="Clear search"
                    onClick={() => setSearch("")}
                    style={{ position: "absolute", right: 6, top: 6, background: "none", border: "none", cursor: "pointer", color: "var(--skin-ink-faint)", padding: 2, lineHeight: 0 }}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              <div ref={sortRef} style={{ position: "relative" }}>
                <button
                  className="x-btn-secondary"
                  aria-label="Sort notes"
                  title={`Sort: ${SORT_LABELS[sort]} (${sortDir === "asc" ? "ascending" : "descending"})`}
                  style={{ height: 32, width: 36, padding: 0, display: "flex", alignItems: "center", justifyContent: "center" }}
                  onClick={() => setSortOpen((v) => !v)}
                >
                  <ArrowUpDown size={15} />
                </button>
                {sortOpen && (
                  <div
                    style={{
                      position: "absolute", right: 0, top: 38, zIndex: 20, width: 190,
                      background: "var(--skin-surface)", border: "1px solid var(--skin-line)",
                      borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.18)", padding: 6,
                    }}
                  >
                    {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
                      <button
                        key={k}
                        onClick={() => { setSort(k); setSortOpen(false); }}
                        style={{
                          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                          gap: 8, padding: "7px 8px", fontSize: 13, borderRadius: 6, border: "none", cursor: "pointer",
                          background: sort === k ? "var(--skin-surface2)" : "transparent", color: "var(--skin-ink)",
                        }}
                      >
                        {SORT_LABELS[k]}
                        {sort === k && <Check size={14} style={{ color: "var(--skin-accent)" }} />}
                      </button>
                    ))}
                    <div style={{ height: 1, background: "var(--skin-line)", margin: "5px 4px" }} />
                    <button
                      onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
                      style={{
                        width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "7px 8px",
                        fontSize: 13, borderRadius: 6, border: "none", cursor: "pointer", background: "transparent", color: "var(--skin-ink)",
                      }}
                    >
                      {sortDir === "asc" ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                      {sortDir === "asc" ? "Ascending" : "Descending"}
                    </button>
                  </div>
                )}
              </div>

              <div ref={filtersRef} style={{ position: "relative" }}>
                <button
                  className="x-btn-secondary"
                  aria-label="Filter notes"
                  style={{
                    height: 32, padding: "0 10px", display: "flex", alignItems: "center", gap: 6, fontSize: 12,
                    borderColor: activeFilterCount ? "var(--skin-accent)" : "var(--skin-line)",
                    color: activeFilterCount ? "var(--skin-accent)" : "var(--skin-ink)",
                  }}
                  onClick={() => setFiltersOpen((v) => !v)}
                >
                  <SlidersHorizontal size={14} />
                  Filters
                  {activeFilterCount > 0 && (
                    <span
                      style={{
                        minWidth: 16, height: 16, borderRadius: 8, fontSize: 10, fontWeight: 600,
                        display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "0 4px",
                        background: "var(--skin-accent)", color: "var(--skin-on-accent, #fff)",
                      }}
                    >
                      {activeFilterCount}
                    </span>
                  )}
                </button>
                {filtersOpen && (
                  <div
                    style={{
                      position: "absolute", right: 0, top: 38, zIndex: 20, width: 260,
                      background: "var(--skin-surface)", border: "1px solid var(--skin-line)",
                      borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.18)", padding: 12,
                    }}
                  >
                    <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--skin-ink-faint)", marginBottom: 4 }}>
                      Project
                    </label>
                    <select
                      className="x-input"
                      style={{ height: 32, fontSize: 12, width: "100%", marginBottom: 12 }}
                      value={filterProject}
                      onChange={(e) => setFilterProject(e.target.value)}
                    >
                      <option value="">All projects</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>

                    {allTags.length > 0 && (
                      <>
                        <span style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--skin-ink-faint)", marginBottom: 6 }}>
                          Tags
                        </span>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12, maxHeight: 120, overflowY: "auto" }}>
                          {allTags.map((t) => {
                            const on = filterTags.includes(t);
                            return (
                              <button
                                key={t}
                                onClick={() => toggleTag(t)}
                                style={{
                                  fontSize: 12, padding: "3px 9px", borderRadius: 999, cursor: "pointer",
                                  border: `1px solid ${on ? "var(--skin-accent)" : "var(--skin-line)"}`,
                                  background: on ? "var(--skin-accent)" : "transparent",
                                  color: on ? "var(--skin-on-accent, #fff)" : "var(--skin-ink)",
                                }}
                              >
                                #{t}
                              </button>
                            );
                          })}
                        </div>
                      </>
                    )}

                    <button
                      onClick={() => setFilterLinked((v) => !v)}
                      style={{
                        width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                        fontSize: 13, padding: "7px 0", border: "none", background: "transparent", cursor: "pointer", color: "var(--skin-ink)",
                      }}
                    >
                      <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <Link2 size={14} /> Linked notes only
                      </span>
                      <span
                        style={{
                          width: 34, height: 18, borderRadius: 999, position: "relative", transition: "background .15s",
                          background: filterLinked ? "var(--skin-accent)" : "var(--skin-line)",
                        }}
                      >
                        <span
                          style={{
                            position: "absolute", top: 2, left: filterLinked ? 18 : 2, width: 14, height: 14,
                            borderRadius: 999, background: "#fff", transition: "left .15s",
                          }}
                        />
                      </span>
                    </button>

                    {activeFilterCount > 0 && (
                      <button
                        onClick={clearAllFilters}
                        className="x-btn-secondary"
                        style={{ height: 30, fontSize: 12, width: "100%", marginTop: 8 }}
                      >
                        Clear all filters
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Active filter chips */}
            {activeFilterCount > 0 && (
              <div className="mb-2 flex flex-wrap items-center gap-2">
                {filterProject && (
                  <FilterChip label={`Project: ${projectName(filterProject) ?? "Unknown"}`} onClear={() => setFilterProject("")} />
                )}
                {filterTags.map((t) => (
                  <FilterChip key={t} label={`#${t}`} onClear={() => toggleTag(t)} />
                ))}
                {filterLinked && <FilterChip label="Linked only" onClear={() => setFilterLinked(false)} />}
                <button
                  onClick={clearAllFilters}
                  style={{ fontSize: 11, color: "var(--skin-accent)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                >
                  Clear all
                </button>
              </div>
            )}

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
                  style={{ height: 28, fontSize: 12, flex: 1, minWidth: 0 }}
                  value=""
                  onChange={(e) => {
                    const v = e.target.value;
                    if (!v) return;
                    bulkAssignMut.mutate({ ids: selected, projectId: v === "__none" ? null : v });
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
                <div style={{ color: "var(--skin-ink-faint)", fontSize: 13 }}>
                  <p style={{ marginBottom: activeFilterCount || search ? 6 : 0 }}>
                    {activeFilterCount || search ? "No notes match your search or filters." : "No notes yet."}
                  </p>
                  {(activeFilterCount > 0 || search) && (
                    <button
                      onClick={() => { clearAllFilters(); setSearch(""); }}
                      style={{ fontSize: 12, color: "var(--skin-accent)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                    >
                      Clear search & filters
                    </button>
                  )}
                </div>
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
                          <div className="flex flex-shrink-0 items-center gap-1">
                            {linked.has(note.id) && <span className="x-badge-linked">linked</span>}
                            <button
                              type="button"
                              aria-label="Organise with Chi"
                              title="Organise with Chi"
                              onClick={(e) => { e.stopPropagation(); setOrganising(note); }}
                              style={{
                                height: 26, width: 26, padding: 0, borderRadius: 6, cursor: "pointer",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                border: "1px solid var(--skin-line)", background: "transparent", color: "var(--skin-accent)",
                              }}
                            >
                              <Sparkles size={14} />
                            </button>
                          </div>
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

          </>
        )}
      </aside>
      )}

      {/* Main content */}
      {showMain && (
      <main style={{ padding: isMobile ? 14 : 32, width: "100%", overflowY: "auto" }}>
        {editing ? (
          <NoteEditor
            key={editing.mode === "edit" ? editing.note.id : "new"}
            editing={editing}
            projects={projects}
            user={user!}
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
            onOrganise={editing.mode === "edit" ? () => setOrganising(editing.note) : undefined}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-center" style={{ color: "var(--skin-ink-faint)", minHeight: 300 }}>
            <div>
              <p style={{ fontSize: 15, color: "var(--skin-ink-soft)" }}>Select a note or create a new one.</p>
            </div>
          </div>
        )}
      </main>
      )}

      {organising && (
        <OrganiseSheet
          open={!!organising}
          user={user}
          intent={noteToIntent(organising.title, organising.body_html)}
          onClose={() => setOrganising(null)}
          onOrganised={() => queryClient.invalidateQueries({ queryKey: ["linked"] })}
        />
      )}
    </div>
  );
}
