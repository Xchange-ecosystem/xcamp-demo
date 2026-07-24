import { useState } from "react";
import { ChevronDown, ChevronUp, Pencil, Plus, Loader2, X } from "lucide-react";
import type { OutputNode } from "@/lib/backcaster-api";
import { ChildChip } from "./ChildChip";

const TYPE_COLORS: Record<string, string> = {
  objective: "var(--accent-yellow, #E6A817)",
  project: "var(--skin-accent)",
  note: "var(--accent-purple, #8B5CF6)",
  task: "var(--accent-green, #16A34A)",
};

export function NodeCard({
  node,
  expanded,
  onToggle,
  onFill,
  filling,
  onRemove,
  onUpdate,
}: {
  node: OutputNode;
  expanded: boolean;
  onToggle: () => void;
  onFill: () => void;
  filling: boolean;
  onRemove?: () => void;
  onUpdate?: (changes: { title?: string; description?: string }) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(node.title);
  const [editDesc, setEditDesc] = useState(node.description ?? "");

  const accent = TYPE_COLORS[node.node_type] ?? "var(--skin-accent)";
  const children = node.children ?? [];

  const handleEditStart = () => {
    setEditTitle(node.title);
    setEditDesc(node.description ?? "");
    setIsEditing(true);
  };

  const handleSave = () => {
    onUpdate?.({ title: editTitle.trim() || node.title, description: editDesc });
    setIsEditing(false);
  };

  return (
    <div
      className="rounded-xl transition-all"
      style={{
        background: "var(--skin-bg)",
        border: `1px solid var(--skin-line)`,
        borderLeft: `3px solid ${accent}`,
      }}
    >
      {isEditing ? (
        <div className="p-4 space-y-2">
          <input
            autoFocus
            className="w-full rounded-lg px-3 py-2 text-sm font-semibold outline-none"
            style={{ background: "var(--skin-surface)", border: "1px solid var(--skin-line)", color: "var(--skin-ink)" }}
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            placeholder="Title"
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
          />
          <textarea
            className="w-full rounded-lg px-3 py-2 text-sm outline-none resize-y"
            style={{ background: "var(--skin-surface)", border: "1px solid var(--skin-line)", color: "var(--skin-ink-soft)" }}
            rows={3}
            value={editDesc}
            onChange={(e) => setEditDesc(e.target.value)}
            placeholder="Description"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSave}
              className="rounded-lg px-3 py-1.5 text-sm font-medium"
              style={{ background: "var(--skin-accent)", color: "#fff" }}
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="rounded-lg px-3 py-1.5 text-sm font-medium"
              style={{ background: "var(--skin-surface)", color: "var(--skin-ink-soft)", border: "1px solid var(--skin-line)" }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="p-4 flex items-start gap-3">
          <button
            type="button"
            onClick={onToggle}
            className="flex-1 min-w-0 text-left cursor-pointer"
          >
            <span
              className="inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide mb-2"
              style={{ background: `${accent}22`, color: accent }}
            >
              {node.node_type}
            </span>
            <h3 className="font-semibold" style={{ color: "var(--skin-ink)" }}>
              {node.title}
            </h3>
            {node.description && (
              <p
                className="mt-1 text-sm"
                style={{
                  color: "var(--skin-ink-soft)",
                  display: "-webkit-box",
                  WebkitLineClamp: expanded ? "unset" : 2,
                  WebkitBoxOrient: "vertical",
                  overflow: expanded ? "visible" : "hidden",
                }}
              >
                {node.description}
              </p>
            )}
          </button>
          <div className="flex items-center gap-0.5 shrink-0 mt-0.5">
            {onUpdate && (
              <button
                type="button"
                onClick={handleEditStart}
                aria-label="Edit"
                className="rounded p-1 transition-colors hover:bg-[color-mix(in_srgb,var(--skin-line)_60%,transparent)]"
                style={{ color: "var(--skin-ink-soft)" }}
              >
                <Pencil size={14} />
              </button>
            )}
            {onRemove && (
              <button
                type="button"
                onClick={onRemove}
                aria-label="Remove"
                className="rounded p-1 transition-colors hover:bg-[color-mix(in_srgb,var(--skin-line)_60%,transparent)]"
                style={{ color: "var(--skin-ink-soft)" }}
              >
                <X size={14} />
              </button>
            )}
            <button
              type="button"
              onClick={onToggle}
              aria-label={expanded ? "Collapse" : "Expand"}
              className="rounded p-1"
              style={{ color: "var(--skin-ink-soft)" }}
            >
              {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
          </div>
        </div>
      )}

      {!isEditing && expanded && (
        <div className="px-4 pb-4 space-y-2">
          {children.slice(0, 3).map((child) => (
            <ChildChip key={child.id} node={child} />
          ))}
          <button
            type="button"
            onClick={onFill}
            disabled={filling}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-60"
            style={{ background: "var(--skin-surface)", color: "var(--skin-accent)", border: "1px solid var(--skin-line)" }}
          >
            {filling ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            Add a step
          </button>
        </div>
      )}
    </div>
  );
}
