import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { X, FileText, Download, Globe, Tag as TagIcon, Target, ArrowLeft, SlidersHorizontal, ChevronDown } from "lucide-react";
import { RichTextEditor } from "./RichTextEditor";
import { NOTE_TYPES, listObjectives, getNoteObjectiveIds } from "@/lib/xcamp-api";
import type { NoteAttachment, NoteRow, ProjectRow, XcampUser } from "@/types/xcamp";

const NOTE_TYPE_LABELS: Record<string, string> = {
  note: "Note",
  task: "Task",
  idea: "Idea",
  question: "Question",
  decision: "Decision",
  reference: "Reference",
};

export type Editing = { mode: "new"; initialBody?: string } | { mode: "edit"; note: NoteRow };

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
}: {
  editing: Editing;
  projects: ProjectRow[];
  user: XcampUser;
  saving: boolean;
  archiving: boolean;
  onSave: (v: NoteEditorValues) => void;
  onCancel: () => void;
  onArchive?: () => void;
}) {
  const initial = editing.mode === "edit" ? editing.note : null;
  const [title, setTitle] = useState(initial?.title ?? "");
  const [body, setBody] = useState(
    editing.mode === "new" ? editing.initialBody ?? "" : initial?.body_html ?? "",
  );
  const [noteType, setNoteType] = useState<string>(initial?.note_type ?? "note");
  const [projectId, setProjectId] = useState<string>(
    (initial?.detail?.project_id as string | undefined) ?? "",
  );
  const [objectiveIds, setObjectiveIds] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>(initial?.tags ?? []);
  const [tagInput, setTagInput] = useState("");
  const [attachments, setAttachments] = useState<NoteAttachment[]>(
    (initial?.detail?.attachments as NoteAttachment[] | undefined) ?? [],
  );
  const [metaOpen, setMetaOpen] = useState(false);

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

  const canSave = title.trim().length > 0 || body.replace(/<[^>]+>/g, "").trim().length > 0;

  const save = () =>
    onSave({
      title: title.trim() || "Untitled",
      bodyHtml: body,
      projectId: projectId || null,
      noteType,
      objectiveIds: projectId ? objectiveIds : [],
      tags,
      attachments,
    });


  return (
    <div className="x-editor" style={{ width: "100%" }}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <div className="flex min-w-0 items-center gap-2">
          <button
            className="x-btn-secondary"
            aria-label="Back to history"
            title="Back to history"
            onClick={onCancel}
            style={{ height: 28, width: 28, padding: 0, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
          >
            <ArrowLeft size={14} />
          </button>
          <span style={{ fontSize: 12, fontWeight: 500, color: "var(--skin-ink-faint)" }}>
            {editing.mode === "new" ? "New note" : "Editing note"}
          </span>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          {onArchive && (
            <button className="x-btn-secondary" style={{ color: "var(--danger)" }} onClick={onArchive} disabled={archiving}>
              {archiving ? "Deleting…" : "Delete"}
            </button>
          )}
          <button className="x-btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button className="x-btn-primary" onClick={save} disabled={!canSave || saving}>
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>


      <textarea
        className="x-input"
        style={{
          fontSize: 26,
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
              onClick={() => setNoteType(t)}
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

      <div className="mb-4" style={{ maxWidth: 280 }}>
        <label className="mb-1 block text-xs font-medium" style={{ color: "var(--skin-ink-soft)" }}>
          Project (optional)
        </label>
        <select
          className="x-input"
          value={projectId}
          onChange={(e) => {
            setProjectId(e.target.value);
            setObjectiveIds([]);
          }}
        >
          <option value="">No project</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {/* Objective selector — only when a project is chosen */}
      {projectId && (
        <div className="mb-4" style={{ maxWidth: 420 }}>
          <label className="mb-1 flex items-center gap-1 text-xs font-medium" style={{ color: "var(--skin-ink-soft)" }}>
            <Target size={12} /> Objectives (optional)
          </label>
          {objectivesQuery.isLoading ? (
            <p style={{ fontSize: 13, color: "var(--skin-ink-faint)" }}>Loading objectives…</p>
          ) : objectives.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--skin-ink-faint)" }}>No objectives in this project.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {objectives.map((o) => {
                const active = objectiveIds.includes(o.id);
                return (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => toggleObjective(o.id)}
                    style={{
                      padding: "5px 12px",
                      borderRadius: 8,
                      fontSize: 13,
                      cursor: "pointer",
                      textAlign: "left",
                      border: `1px solid ${active ? "var(--skin-accent)" : "var(--skin-line)"}`,
                      background: active ? "var(--skin-accent-soft, rgba(20,184,166,0.12))" : "transparent",
                      color: active ? "var(--skin-accent)" : "var(--skin-ink-soft)",
                    }}
                  >
                    {active ? "✓ " : ""}
                    {o.title}
                  </button>
                );
              })}
            </div>
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
