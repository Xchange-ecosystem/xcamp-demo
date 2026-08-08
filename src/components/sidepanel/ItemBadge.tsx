import type { ItemKind } from "@/lib/sidepanel-service";

const TYPE_LABELS: Record<string, string> = {
  all: "All",
  objective: "Objective",
  note: "Note",
  task: "Task",
  idea: "Idea",
  question: "Question",
  decision: "Decision",
  reference: "Reference",
};

interface ItemBadgeProps {
  kind: ItemKind;
  noteType?: string;
  className?: string;
}

export function ItemBadge({ kind, noteType, className }: ItemBadgeProps) {
  const typeKey = kind === "note" && noteType ? noteType : kind;
  const label = TYPE_LABELS[typeKey] ?? typeKey;

  return (
    <span
      className={`x-item-badge${className ? ` ${className}` : ""}`}
      style={{
        background: `var(--item-${typeKey})`,
        color: `var(--item-${typeKey}-fg)`,
      }}
    >
      {label}
    </span>
  );
}

// Filter chip variant used in the add-link search panel
export function ItemTypeChip({
  typeKey,
  active,
  onClick,
}: {
  typeKey: string;
  active: boolean;
  onClick: () => void;
}) {
  const label = TYPE_LABELS[typeKey] ?? typeKey;
  const isAll = typeKey === "all";
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "4px 12px",
        borderRadius: "var(--xr-pill)",
        fontSize: 12,
        fontWeight: 500,
        cursor: "pointer",
        border: active ? "none" : "1px solid var(--skin-line)",
        background: active
          ? isAll
            ? "var(--skin-accent)"
            : `var(--item-${typeKey})`
          : "transparent",
        color: active
          ? isAll
            ? "var(--skin-bg)"
            : `var(--item-${typeKey}-fg)`
          : "var(--skin-ink-soft)",
        transition: "background 120ms ease, color 120ms ease",
      }}
    >
      {label}
    </button>
  );
}
