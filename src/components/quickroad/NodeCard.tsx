import { ChevronDown, ChevronUp, Plus, Loader2 } from "lucide-react";
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
}: {
  node: OutputNode;
  expanded: boolean;
  onToggle: () => void;
  onFill: () => void;
  filling: boolean;
}) {
  const accent = TYPE_COLORS[node.node_type] ?? "var(--skin-accent)";
  const children = node.children ?? [];

  return (
    <div
      className="rounded-xl transition-all"
      style={{
        background: "var(--skin-bg)",
        border: `1px solid var(--skin-line)`,
        borderLeft: `3px solid ${accent}`,
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        className="w-full text-left p-4 flex items-start gap-3 cursor-pointer"
      >
        <div className="flex-1 min-w-0">
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
        </div>
        <span style={{ color: "var(--skin-ink-soft)" }} className="shrink-0 mt-1">
          {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </span>
      </button>

      {expanded && (
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
