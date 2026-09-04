import { useState } from "react";
import { ArrowLeft, Compass } from "lucide-react";
import type { ObjectiveRow } from "@/lib/navigator-api";

const STATUS_LABELS: Record<string, string> = {
  inactive: "Inactive",
  active: "Active",
  completed: "Completed",
};

export interface ObjectiveEditorValues {
  title: string;
  description: string | null;
}

export function ObjectiveEditor({
  objective,
  saving,
  onSave,
  onCancel,
}: {
  objective: ObjectiveRow;
  saving: boolean;
  onSave: (v: ObjectiveEditorValues) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(objective.title ?? "");
  const [description, setDescription] = useState(objective.description ?? "");

  const canSave = title.trim().length > 0;

  const save = () =>
    onSave({
      title: title.trim() || "Untitled objective",
      description: description.trim() ? description.trim() : null,
    });

  return (
    <div className="x-editor" style={{ width: "100%" }}>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-2">
          <button
            className="x-btn-secondary"
            aria-label="Back"
            title="Back"
            onClick={onCancel}
            style={{
              height: 28,
              width: 28,
              padding: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <ArrowLeft size={14} />
          </button>
          <span
            className="flex items-center gap-1.5"
            style={{ fontSize: 12, fontWeight: 500, color: "var(--skin-ink-faint)" }}
          >
            <Compass size={14} style={{ color: "var(--skin-accent)" }} /> Editing objective
          </span>
        </div>
        <div className="flex items-center gap-2 sm:ml-auto">
          <button className="x-btn-secondary flex-1 sm:flex-none" onClick={onCancel}>
            Cancel
          </button>
          <button
            className="x-btn-primary flex-1 sm:flex-none"
            onClick={save}
            disabled={!canSave || saving}
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

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
        }}
        rows={1}
        placeholder="Objective title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />

      <div className="mb-4" style={{ maxWidth: 240 }}>
        <label className="mb-1 block text-xs font-medium" style={{ color: "var(--skin-ink-soft)" }}>
          Status
        </label>
        <div
          style={{
            height: 34,
            fontSize: 13,
            display: "flex",
            alignItems: "center",
            color: "var(--skin-ink-soft)",
          }}
        >
          {STATUS_LABELS[objective.status ?? "inactive"] ?? objective.status ?? "Inactive"}
        </div>
      </div>

      <div className="mb-4">
        <label className="mb-1 block text-xs font-medium" style={{ color: "var(--skin-ink-soft)" }}>
          Description
        </label>
        <textarea
          className="x-input"
          style={{
            width: "100%",
            minHeight: 160,
            fontSize: 14,
            lineHeight: 1.5,
            padding: 12,
            resize: "vertical",
          }}
          placeholder="Describe this objective…"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
    </div>
  );
}
