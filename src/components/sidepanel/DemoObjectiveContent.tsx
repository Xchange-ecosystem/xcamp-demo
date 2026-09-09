import { useState } from "react";
import { Download, FileText, X } from "lucide-react";
import { RichTextEditor } from "@/components/editor/RichTextEditor";
import { useDemoItemsStore } from "@/store/demoItemsStore";
import { getTasksByObjective } from "@/fixtures/objectives";
import { MetricCard, StatRow } from "@/components/project-home/MetricPrimitives";
import type { ObjectiveStatus } from "@/fixtures/types";
import type { NoteAttachment } from "@/types/xcamp";

const STATUS_OPTIONS: { value: ObjectiveStatus; label: string }[] = [
  { value: "suggested", label: "Suggested" },
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In progress" },
  { value: "done", label: "Done" },
];

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Demo counterpart to ItemSidepanel's ObjectiveContent — same fields (title,
// status, tags, description, attachments, metrics), sourced from
// useDemoItemsStore instead of `supabase.from("objectives")`, every edit a
// local store update instead of `updateObjective`. No AI summary: dropped
// entirely for the demo per the B1 session's non-goals (no
// generateObjectiveSummary/voxFetch call, no fixture stand-in).
export function DemoObjectiveContent({ itemId }: { itemId: string }) {
  const objective = useDemoItemsStore((s) => s.objectives[itemId]);
  const updateObjective = useDemoItemsStore((s) => s.updateObjective);
  const [tagInput, setTagInput] = useState("");

  if (!objective || objective.deleted) {
    return (
      <p style={{ fontSize: 13, color: "var(--skin-ink-faint)", margin: 0 }}>
        This objective was removed.
      </p>
    );
  }

  const tasks = getTasksByObjective(objective.id);
  const tasksCompleted = tasks.filter((t) => t.done).length;

  const addTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (t && !objective.tags.includes(t)) {
      updateObjective(itemId, { tags: [...objective.tags, t] });
    }
    setTagInput("");
  };

  const addAttachment = (att: NoteAttachment) => {
    updateObjective(itemId, { attachments: [...objective.attachments, att] });
  };

  const removeAttachment = (attId: string) => {
    updateObjective(itemId, {
      attachments: objective.attachments.filter((a) => a.id !== attId),
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Title */}
      <input
        className="x-input"
        value={objective.title}
        onChange={(e) => updateObjective(itemId, { title: e.target.value })}
        placeholder="Objective title"
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
          value={objective.status}
          onChange={(e) => updateObjective(itemId, { status: e.target.value as ObjectiveStatus })}
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
          {objective.tags.map((t) => (
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
                onClick={() =>
                  updateObjective(itemId, { tags: objective.tags.filter((x) => x !== t) })
                }
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

      {/* Metrics — fixture-derived, no AI summary */}
      <div>
        <h4 className="x-preview-title">Metrics</h4>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <MetricCard label="Tasks">
            <StatRow big={tasks.length.toLocaleString()} small="total" />
            <StatRow big={tasksCompleted.toLocaleString()} small="completed" />
          </MetricCard>
          <MetricCard label="Attachments">
            <StatRow
              big={objective.attachments.length.toLocaleString()}
              small="on this objective"
            />
          </MetricCard>
        </div>
      </div>

      {/* Description */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <label style={{ fontSize: 12, fontWeight: 500, color: "var(--skin-ink-faint)" }}>
          Description
        </label>
        <RichTextEditor
          content={objective.description ?? ""}
          onChange={(html) => updateObjective(itemId, { description: html })}
          onAddAttachment={addAttachment}
        />
      </div>

      {/* Attachments preview */}
      {objective.attachments.length > 0 && (
        <div className="x-preview-section">
          <h4 className="x-preview-title">Attachments ({objective.attachments.length})</h4>
          {objective.attachments.filter((a) => a.mime.startsWith("image/")).length > 0 && (
            <div className="x-attach-grid">
              {objective.attachments
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
          {objective.attachments
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
