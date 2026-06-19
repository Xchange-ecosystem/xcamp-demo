import type { OutputNode } from "@/lib/backcaster-api";

export function ChildChip({ node }: { node: OutputNode }) {
  return (
    <div
      className="rounded-lg px-3 py-2 text-sm"
      style={{
        background: "var(--skin-surface)",
        border: "1px solid var(--skin-line)",
        color: "var(--skin-ink)",
      }}
    >
      <span className="font-medium">{node.title}</span>
      {node.description && (
        <span className="ml-1" style={{ color: "var(--skin-ink-soft)" }}>
          — {node.description}
        </span>
      )}
    </div>
  );
}
