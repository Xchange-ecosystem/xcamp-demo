import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { X, FileText, Download, Globe, Tag as TagIcon, Target } from "lucide-react";
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
  tags: string[];
  attachments: NoteAttachment[];
}

export function NoteEditor({
  editing,
  projects,
  saving,
  archiving,
  onSave,
  onCancel,
  onArchive,
}: {
  editing: Editing;
  projects: ProjectRow[];
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
  const [projectId, setProjectId] = useState<string>(
    (initial?.detail?.project_id as string | undefined) ?? "",
  );
  const [tags, setTags] = useState<string[]>(initial?.tags ?? []);
  const [tagInput, setTagInput] = useState("");
  const [attachments, setAttachments] = useState<NoteAttachment[]>(
    (initial?.detail?.attachments as NoteAttachment[] | undefined) ?? [],
  );

  const links = useMemo(() => extractLinks(body), [body]);
  const imageAtts = attachments.filter((a) => a.mime.startsWith("image/"));
  const fileAtts = attachments.filter((a) => !a.mime.startsWith("image/"));

  const addTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (t && !tags.includes(t)) setTags([...tags, t]);
    setTagInput("");
  };

  const canSave = title.trim().length > 0 || body.replace(/<[^>]+>/g, "").trim().length > 0;

  const save = () =>
    onSave({
      title: title.trim() || "Untitled",
      bodyHtml: body,
      projectId: projectId || null,
      tags,
      attachments,
    });

  return (
    <div className="x-editor" style={{ width: "100%" }}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <span style={{ fontSize: 12, fontWeight: 500, color: "var(--skin-ink-faint)" }}>
          {editing.mode === "new" ? "New note" : "Editing note"}
        </span>
        <div className="flex items-center gap-2">
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

      <input
        className="x-input"
        style={{ fontSize: 26, fontWeight: 700, border: "none", background: "transparent", padding: 0, marginBottom: 16 }}
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
