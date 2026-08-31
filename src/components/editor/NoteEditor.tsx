import { useMemo, useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  X,
  FileText,
  Download,
  Globe,
  Tag as TagIcon,
  ArrowLeft,
  SlidersHorizontal,
  ChevronDown,
  Sparkles,
  MoreVertical,
  Trash2,
} from "lucide-react";
import { RichTextEditor } from "./RichTextEditor";
import { NOTE_TYPES, listObjectives, getNoteObjectiveIds } from "@/lib/xcamp-api";
import { MultiSelectDropdown } from "@/components/ui/multi-select";
import { useDebounce } from "@/hooks/useDebounce";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import type { NoteAttachment, NoteRow, ProjectRow, XcampUser } from "@/types/xcamp";

const NOTE_TYPE_LABELS: Record<string, string> = {
  note: "Note",
  task: "Task",
  idea: "Idea",
  question: "Question",
  decision: "Decision",
  reference: "Reference",
};

export type Editing = { mode: "new"; initialBody?: string; initialProjectId?: string } | { mode: "edit"; note: NoteRow };

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function extractLinks(html: string): { href: string; label: string }[] {
  if (typeof window === "undefined") return [];
  const doc = new DOMParser().parseFromString(html, "text/html");
  const seen = new Set<string>();
  const links: { href: string; label: string }[] = [];
  doc.querySelectorAll("a[href]").forEach((a) => {
    const href = a.getAttribute("href") ?? "";
    if (!href || seen.has(href)) return;
    seen.add(href);
    links.push({ href, label: a.textContent?.trim() || href });
  });
  return links;
}

function hostname(url: string) {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

export interface NoteEditorValues {
  title: string;
  bodyHtml: string;
  projectId?: string | null;
  noteType: string;
  objectiveIds: string[];
  tags: string[];
  attachments: NoteAttachment[];
}

export function NoteEditor({
  editing,
  projects,
  user,
  saving,
  archiving,
  onSave,
  onCancel,
  onArchive,
  onOrganise,
  embedded,
}: {
  editing: Editing;
  projects: ProjectRow[];
  user: XcampUser;
  saving: boolean;
  archiving: boolean;
  onSave: (v: NoteEditorValues) => void;
  onCancel: () => void;
  onArchive?: () => void;
  onOrganise?: () => void;
  /** When true, suppresses the back-arrow / label / save-status header row (sidepanel provides its own). */
  embedded?: boolean;
}) {
  const initial = editing.mode === "edit" ? editing.note : null;
  const [title, setTitle] = useState(initial?.title ?? "");
  const [body, setBody] = useState(
    editing.mode === "new" ? editing.initialBody ?? "" : initial?.body_html ?? "",
  );
  const [noteType, setNoteType] = useState<string>(initial?.note_type ?? "note");
  const [projectId, setProjectId] = useState<string>(
    editing.mode === "new"
      ? (editing.initialProjectId ?? "")
      : ((initial?.detail?.project_id as string | undefined) ?? ""),
  );
  const [objectiveIds, setObjectiveIds] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>(initial?.tags ?? []);
  const [tagInput, setTagInput] = useState("");
  const [attachments, setAttachments] = useState<NoteAttachment[]>(
    (initial?.detail?.attachments as NoteAttachment[] | undefined) ?? [],
  );
  const [metaOpen, setMetaOpen] = useState(false);

  // Autosave state
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);

  // Unsaved-changes tracking — skip the very first render
  const isFirstRender = useRef(true);
  const hasUnsavedChanges = useRef(false);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    hasUnsavedChanges.current = true;
  }, [body, title, noteType, projectId, tags, attachments]);

  // Debounced values for autosave (1500 ms) — only body/title need debouncing
  // (continuous typing); metadata fields below change via discrete clicks and
  // are compared directly, undebounced.
  const debouncedBody = useDebounce(body, 1500);
  const debouncedTitle = useDebounce(title, 1500);

  // Stable initial-value refs — set once on mount, never change
  const initialBodyRef = useRef(body);
  const initialTitleRef = useRef(title);
  const initialProjectIdRef = useRef(projectId);
  const initialTagsRef = useRef(tags);
  const initialAttachmentsRef = useRef(attachments);

  // Keep onSave prop fresh without it being a dep of the autosave effect
  const onSaveRef = useRef(onSave);
  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  // Objective links are independent of project assignment (objective_notes has
  // no project_id): a note with no project can still be linked to objectives,
  // e.g. every Navigator-created task. Only drop objectiveIds when the user
  // actively clears a project this session (initialProjectIdRef was non-empty)
  // — that mirrors "unassigning the project drops its objectives". A note
  // that never had a project keeps whatever objectiveIds were loaded/edited.
  const currentObjectiveIds = () => (projectId || !initialProjectIdRef.current ? objectiveIds : []);

  // Always-fresh snapshot of current save values, updated every render
  const currentValuesRef = useRef<NoteEditorValues>({
    title: title.trim() || "Untitled",
    bodyHtml: body,
    projectId: projectId || null,
    noteType,
    objectiveIds: currentObjectiveIds(),
    tags,
    attachments,
  });
  useEffect(() => {
    currentValuesRef.current = {
      title: title.trim() || "Untitled",
      bodyHtml: body,
      projectId: projectId || null,
      noteType,
      objectiveIds: currentObjectiveIds(),
      tags,
      attachments,
    };
  });

  // Autosave: fires 1500 ms after the last title/content keystroke, or right
  // away when project/tags/attachments change on their own — those, like
  // noteType (saved immediately by handleTypeChange below), previously fell
  // out of scope entirely (dependency array only covered body/title), so
  // e.g. reassigning a note's project with no title/body touch was silently
  // dropped on close, never reaching the database. noteType is intentionally
  // left out of this effect's guard/deps — handleTypeChange already saves it
  // immediately on click, and including it here too would fire a redundant
  // second save on the same change.
  useEffect(() => {
    const unchanged =
      debouncedBody === initialBodyRef.current &&
      debouncedTitle === initialTitleRef.current &&
      projectId === initialProjectIdRef.current &&
      tags === initialTagsRef.current &&
      attachments === initialAttachmentsRef.current;
    if (unchanged) return;
    const isNonEmpty =
      debouncedTitle.trim().length > 0 ||
      debouncedBody.replace(/<[^>]+>/g, "").trim().length > 0;
    if (!isNonEmpty) return;
    setSaveStatus("saving");
    onSaveRef.current(currentValuesRef.current);
  }, [debouncedBody, debouncedTitle, projectId, tags, attachments]);

  // Detect when saving prop transitions true → false (save completed)
  const prevSaving = useRef(false);
  useEffect(() => {
    if (prevSaving.current && !saving) {
      setSaveStatus("saved");
      hasUnsavedChanges.current = false;
      const t = setTimeout(
        () => setSaveStatus((s) => (s === "saved" ? "idle" : s)),
        2000,
      );
      return () => clearTimeout(t);
    }
    prevSaving.current = saving;
  }, [saving]);

  // Load existing objective links for an edited note (once).
  useQuery({
    queryKey: ["note-objectives", initial?.id],
    queryFn: async () => {
      const ids = await getNoteObjectiveIds(initial!.id);
      setObjectiveIds(ids);
      return ids;
    },
    enabled: editing.mode === "edit" && !!initial?.id,
  });

  // Load objectives for the selected project.
  const objectivesQuery = useQuery({
    queryKey: ["objectives", projectId, user.tenantId],
    queryFn: () => listObjectives(user, projectId),
    enabled: !!projectId,
  });
  const objectives = objectivesQuery.data ?? [];

  const links = useMemo(() => extractLinks(body), [body]);
  const imageAtts = attachments.filter((a) => a.mime.startsWith("image/"));
  const fileAtts = attachments.filter((a) => !a.mime.startsWith("image/"));

  const addTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (t && !tags.includes(t)) setTags([...tags, t]);
    setTagInput("");
  };

  const toggleObjective = (id: string) =>
    setObjectiveIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  // Type pills are a discrete, deliberate action — save immediately rather than
  // waiting on the body/title debounce, which would make the click feel unresponsive.
  const handleTypeChange = (t: string) => {
    if (t === noteType) return;
    setNoteType(t);
    setSaveStatus("saving");
    onSaveRef.current({ ...currentValuesRef.current, noteType: t });
  };

  const handleBack = () => {
    if (hasUnsavedChanges.current) {
      setShowUnsavedModal(true);
    } else {
      onCancel();
    }
  };

  return (
    <div className="x-editor" style={{ width: "100%" }}>
      {/* Header row — hidden when embedded inside sidepanel */}
      {!embedded && <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-2">
          <button
            className="x-btn-secondary"
            aria-label="Back to history"
            title="Back to history"
            onClick={handleBack}
            style={{ height: 28, width: 28, padding: 0, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
          >
            <ArrowLeft size={14} />
          </button>
          <span style={{ fontSize: 12, fontWeight: 500, color: "var(--skin-ink-faint)" }}>
            {editing.mode === "new" ? "New note" : "Editing note"}
          </span>
          {saveStatus === "saving" && (
            <span style={{ fontSize: 12, color: "var(--skin-ink-faint)" }}>Saving…</span>
          )}
          {saveStatus === "saved" && (
            <span style={{ fontSize: 12, color: "var(--skin-ink-faint)" }}>Saved</span>
          )}
        </div>
        <div className="flex flex-col gap-2 sm:ml-auto sm:flex-row sm:items-center">
          {onOrganise && (
            <button className="x-btn-secondary w-full sm:w-auto" onClick={onOrganise} title="Organise with Chi">
              <Sparkles size={13} style={{ display: "inline", marginRight: 4 }} />
              Organise with Chi
            </button>
          )}
          {onArchive && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="x-btn-secondary"
                  aria-label="More options"
                  style={{ height: 32, width: 32, padding: 0, display: "flex", alignItems: "center", justifyContent: "center" }}
                >
                  <MoreVertical size={14} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={onArchive}
                  disabled={archiving}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  {archiving ? "Deleting…" : "Delete note"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>}

      {/* Unsaved changes confirmation dialog */}
      <Dialog open={showUnsavedModal} onOpenChange={setShowUnsavedModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unsaved changes</DialogTitle>
          </DialogHeader>
          <p style={{ fontSize: 14, color: "var(--skin-ink-soft)" }}>
            Your changes haven’t been saved yet. Leave anyway?
          </p>
          <DialogFooter>
            <button className="x-btn-secondary" onClick={() => setShowUnsavedModal(false)}>
              Stay
            </button>
            <button
              className="x-btn-primary"
              onClick={() => {
                setShowUnsavedModal(false);
                onCancel();
              }}
            >
              Leave anyway
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <textarea
        className="x-input x-editor-title"
        style={{
          fontWeight: 700,
          border: "none",
          background: "transparent",
          padding: 0,
          marginBottom: 16,
          width: "100%",
          resize: "none",
          overflow: "hidden",
          lineHeight: 1.2,
          minHeight: 36,
          fieldSizing: "content",
        }}
        rows={1}
        placeholder="Note title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />

      {/* Collapsible meta: type / project / objectives / tags */}
      <button
        type="button"
        onClick={() => setMetaOpen((o) => !o)}
        aria-expanded={metaOpen}
        className="mb-4 flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2"
        style={{ border: "1px solid var(--skin-line)", background: "transparent", cursor: "pointer" }}
      >
        <span className="flex min-w-0 items-center gap-2" style={{ fontSize: 13, fontWeight: 500, color: "var(--skin-ink-soft)" }}>
          <SlidersHorizontal size={14} style={{ flexShrink: 0 }} />
          <span className="truncate">
            {NOTE_TYPE_LABELS[noteType] ?? noteType}
            {tags.length > 0 ? ` · ${tags.length} tag${tags.length > 1 ? "s" : ""}` : ""}
          </span>
        </span>
        <ChevronDown
          size={16}
          style={{ flexShrink: 0, transition: "transform 0.2s", transform: metaOpen ? "rotate(180deg)" : "none", color: "var(--skin-ink-faint)" }}
        />
      </button>

      {metaOpen && (
      <>
      {/* Note type pill selector */}
      <div className="mb-4 flex flex-wrap gap-2">
        {NOTE_TYPES.map((t) => {
          const active = noteType === t;
          return (
            <button
              key={t}
              type="button"
              onClick={() => handleTypeChange(t)}
              className="x-pill"
              style={{
                padding: "5px 12px",
                borderRadius: 999,
                fontSize: 13,
                fontWeight: 500,
                cursor: "pointer",
                border: `1px solid ${active ? "var(--skin-accent)" : "var(--skin-line)"}`,
                background: active ? "var(--skin-accent)" : "transparent",
                color: active ? "#fff" : "var(--skin-ink-soft)",
              }}
            >
              {NOTE_TYPE_LABELS[t] ?? t}
            </button>
          );
        })}
      </div>

      <div className="mb-4" style={{ maxWidth: 320 }}>
        <MultiSelectDropdown
          label="Project (optional)"
          placeholder="No project"
          single
          options={projects.map((p) => ({ value: p.id, label: p.name }))}
          selected={projectId ? [projectId] : []}
          onChange={(ids) => {
            const next = ids[0] ?? "";
            setProjectId(next);
            setObjectiveIds([]);
          }}
        />
      </div>

      {/* Objective selector — only when a project is chosen */}
      {projectId && (
        <div className="mb-4" style={{ maxWidth: 420 }}>
          {objectivesQuery.isLoading ? (
            <p style={{ fontSize: 13, color: "var(--skin-ink-faint)" }}>Loading objectives…</p>
          ) : objectives.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--skin-ink-faint)" }}>No objectives in this project.</p>
          ) : (
            <MultiSelectDropdown
              label="Objectives (optional)"
              placeholder="Select objectives…"
              options={objectives.map((o) => ({ value: o.id, label: o.title }))}
              selected={objectiveIds}
              onChange={setObjectiveIds}
            />
          )}
        </div>
      )}

      {/* Tags */}
      <div className="mb-4">
        <label className="mb-1 flex items-center gap-1 text-xs font-medium" style={{ color: "var(--skin-ink-soft)" }}>
          <TagIcon size={12} /> Tags
        </label>
        <div className="flex flex-wrap items-center gap-2">
          {tags.map((t) => (
            <span key={t} className="x-tag">
              {t}
              <button onClick={() => setTags(tags.filter((x) => x !== t))} aria-label={`Remove ${t}`}>
                <X size={12} />
              </button>
            </span>
          ))}
          <input
            className="x-input"
            style={{ width: 160, height: 30, fontSize: 13 }}
            placeholder="Add tag…"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addTag();
              }
            }}
          />
        </div>
      </div>
      </>
      )}

      <RichTextEditor
        content={body}
        onChange={setBody}
        onAddAttachment={(att) => setAttachments((prev) => [...prev, att])}
      />

      {/* Attachments preview */}
      {(imageAtts.length > 0 || fileAtts.length > 0) && (
        <div className="x-preview-section">
          <h4 className="x-preview-title">Attachments ({attachments.length})</h4>
          {imageAtts.length > 0 && (
            <div className="x-attach-grid">
              {imageAtts.map((a) => (
                <figure key={a.id} className="x-attach-img">
                  <img src={a.dataUrl} alt={a.name} />
                  <figcaption>
                    <span className="truncate">{a.name}</span>
                    <button onClick={() => setAttachments((p) => p.filter((x) => x.id !== a.id))} aria-label="Remove">
                      <X size={12} />
                    </button>
                  </figcaption>
                </figure>
              ))}
            </div>
          )}
          {fileAtts.map((a) => (
            <div key={a.id} className="x-file-card">
              <FileText size={18} style={{ color: "var(--skin-accent)" }} />
              <div className="min-w-0 flex-1">
                <div className="truncate" style={{ fontSize: 13, fontWeight: 500 }}>
                  {a.name}
                </div>
                <div style={{ fontSize: 11, color: "var(--skin-ink-faint)" }}>{formatBytes(a.size)}</div>
              </div>
              <a href={a.dataUrl} download={a.name} className="x-icon-link" title="Download">
                <Download size={16} />
              </a>
              <button className="x-icon-link" onClick={() => setAttachments((p) => p.filter((x) => x.id !== a.id))} title="Remove">
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Links preview */}
      {links.length > 0 && (
        <div className="x-preview-section">
          <h4 className="x-preview-title">Links ({links.length})</h4>
          {links.map((l) => (
            <a key={l.href} href={l.href} target="_blank" rel="noopener noreferrer" className="x-link-card">
              <img
                src={`https://www.google.com/s2/favicons?domain=${hostname(l.href)}&sz=32`}
                alt=""
                width={16}
                height={16}
                style={{ flexShrink: 0 }}
              />
              <div className="min-w-0 flex-1">
                <div className="truncate" style={{ fontSize: 13, fontWeight: 500 }}>
                  {l.label}
                </div>
                <div className="truncate" style={{ fontSize: 11, color: "var(--skin-ink-faint)" }}>
                  {hostname(l.href)}
                </div>
              </div>
              <Globe size={14} style={{ color: "var(--skin-ink-faint)", flexShrink: 0 }} />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
