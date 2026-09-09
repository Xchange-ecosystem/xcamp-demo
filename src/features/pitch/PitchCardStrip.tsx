import type { PitchCardState } from "@/fixtures/pitch";

export interface PitchStripCard {
  id: string;
  name: string;
  state: PitchCardState;
  composedAt: string | null;
}

function stateLabel(card: PitchStripCard): string {
  if (card.state === "empty") return "Ready to compose";
  if (card.state === "stale") return "Sources changed";
  return `Composed ${card.composedAt ?? ""}`;
}

function stateLabelColor(state: PitchCardState): string | undefined {
  if (state === "stale") return "var(--skin-ink-faint)";
  if (state === "empty") return "var(--skin-accent)";
  return undefined;
}

export function PitchCardStrip({
  cards,
  activeId,
  onSelect,
}: {
  cards: PitchStripCard[];
  activeId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div
      className="flex gap-2 overflow-x-auto py-4"
      style={{ scrollbarWidth: "thin" }}
      role="tablist"
      aria-label="Pitch cards"
    >
      {cards.map((card) => {
        const selected = card.id === activeId;
        return (
          <button
            key={card.id}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-current={selected}
            onClick={() => onSelect(card.id)}
            className="flex min-w-[130px] shrink-0 flex-col gap-0.5 rounded-[var(--xr-lg)] px-3.5 py-2.5 text-left transition-colors"
            style={{
              background: card.state === "empty" ? "transparent" : "var(--skin-surface)",
              border: `1px solid ${selected ? "var(--skin-ink)" : "var(--skin-line)"}`,
              borderStyle: card.state === "empty" ? "dashed" : "solid",
              boxShadow: selected ? "inset 0 0 0 1px var(--skin-ink)" : "none",
            }}
          >
            <span className="text-sm font-medium" style={{ color: "var(--skin-ink)" }}>
              {card.name}
            </span>
            <span
              className="text-xs"
              style={{ color: stateLabelColor(card.state) ?? "var(--skin-ink-faint)" }}
            >
              {stateLabel(card)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
