import { useState } from "react";
import { Download, FileText, X } from "lucide-react";
import { RichTextEditor } from "@/components/editor/RichTextEditor";
import { useDemoItemsStore } from "@/store/demoItemsStore";
import type { TaskStatus } from "@/fixtures/types";
import type { NoteAttachment } from "@/types/xcamp";

const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: "inactive", label: "Inactive" },
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
];

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Demo counterpart to ItemSidepanel's NoteContent, for demo task ids only
// (the only demo note_type the sidepanel opens — see FullscreenButton).
// Sourced from useDemoItemsStore instead of `supabase.from("notes")` +
// NoteEditor; every edit a local store update instead of `updateNote`. No
// NoteEditor reuse here since that component's onSave path assumes a real
// signed-in user — this renders the same fields (title, status, tags, body,
// attachments) directly against the fixture task.
export function DemoNoteContent({ itemId }: { itemId: string }) {
  const task = useDemoItemsStore((s) => s.tasks[itemId]);
  const updateTask = useDemoItemsStore((s) => s.updateTask);
  const [tagInput, setTagInput] = useState("");

  if (!task || task.deleted) {
    return (
      <p style={{ fontSize: 13, color: "var(--skin-ink-faint)", margin: 0 }}>
        This task was removed.
      </p>
    );
  }

  const addTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (t && !task.tags.includes(t)) {
      updateTask(itemId, { tags: [...task.tags, t] });
    }
    setTagInput("");
  };

  const addAttachment = (att: NoteAttachment) => {
    updateTask(itemId, { attachments: [...task.attachments, att] });
  };

  const removeAttachment = (attId: string) => {
    updateTask(itemId, { attachments: task.attachments.filter((a) => a.id !== attId) });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Title */}
      <input
        className="x-input"
        value={task.title}
        onChange={(e) => updateTask(itemId, { title: e.target.value })}
        placeholder="Task title"
        style={{ width: "100%", fontSize: 18, fontWeight: 700, padding: "8px 10px" }}
      />

      {/* Status */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <label
          style={{ fontSize: 12, fontWeight: 500, color: "var(--skin-ink-faint)", minWidth: 60 }}
        >
          Status
        </label>
        <select
          value={task.status}
          onChange={(e) => {
            const status = e.target.value as TaskStatus;
            updateTask(itemId, { status, done: status === "completed" });
          }}
          className="x-input"
          style={{ fontSize: 13, padding: "4px 8px" }}
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {/* Tags */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <label style={{ fontSize: 12, fontWeight: 500, color: "var(--skin-ink-faint)" }}>
          Tags
        </label>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          {task.tags.map((t) => (
            <span
              key={t}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                fontSize: 12,
                padding: "3px 8px",
                borderRadius: 99,
                background: "var(--skin-surface2)",
                border: "1px solid var(--skin-line)",
                color: "var(--skin-ink)",
              }}
            >
              {t}
              <button
                onClick={() => updateTask(itemId, { tags: task.tags.filter((x) => x !== t) })}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                  color: "var(--skin-ink-faint)",
                  display: "flex",
                }}
              >
                <X size={10} />
              </button>
            </span>
          ))}
          <input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === ",") {
                e.preventDefault();
                addTag();
              }
            }}
            placeholder="Add tag…"
            style={{
              fontSize: 12,
              background: "none",
              border: "1px dashed var(--skin-line)",
              borderRadius: 99,
              padding: "3px 10px",
              outline: "none",
              color: "var(--skin-ink)",
              minWidth: 80,
            }}
          />
        </div>
      </div>

      {/* Body */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <label style={{ fontSize: 12, fontWeight: 500, color: "var(--skin-ink-faint)" }}>
          Description
        </label>
        <RichTextEditor
          content={task.bodyHtml}
          onChange={(html) => updateTask(itemId, { bodyHtml: html })}
          onAddAttachment={addAttachment}
        />
      </div>

      {/* Attachments preview */}
      {task.attachments.length > 0 && (
        <div className="x-preview-section">
          <h4 className="x-preview-title">Attachments ({task.attachments.length})</h4>
          {task.attachments.filter((a) => a.mime.startsWith("image/")).length > 0 && (
            <div className="x-attach-grid">
              {task.attachments
                .filter((a) => a.mime.startsWith("image/"))
                .map((a) => (
                  <figure key={a.id} className="x-attach-img">
                    <img src={a.dataUrl} alt={a.name} />
                    <figcaption>
                      <span className="truncate">{a.name}</span>
                      <button onClick={() => removeAttachment(a.id)} aria-label="Remove">
                        <X size={12} />
                      </button>
                    </figcaption>
                  </figure>
                ))}
            </div>
          )}
          {task.attachments
            .filter((a) => !a.mime.startsWith("image/"))
            .map((a) => (
              <div key={a.id} className="x-file-card">
                <FileText size={18} style={{ color: "var(--skin-accent)" }} />
                <div className="min-w-0 flex-1">
                  <div className="truncate" style={{ fontSize: 13, fontWeight: 500 }}>
                    {a.name}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--skin-ink-faint)" }}>
                    {formatBytes(a.size)}
                  </div>
                </div>
                <a href={a.dataUrl} download={a.name} className="x-icon-link" title="Download">
                  <Download size={16} />
                </a>
                <button
                  className="x-icon-link"
                  onClick={() => removeAttachment(a.id)}
                  title="Remove"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
