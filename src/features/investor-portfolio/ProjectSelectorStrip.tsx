import type { CSSProperties } from "react";
import { getProjectById, getRankedPortfolio } from "@/fixtures";

// Part 2 — horizontal-scroll project selector. Selection state is owned by
// the parent screen and shared with the Part 1 bar list and the Part 3 feed,
// so picking a project here (or a bar, they're the same selection) filters
// both.

function tileStyle(selected: boolean): CSSProperties {
  return {
    flex: "0 0 auto",
    width: 186,
    textAlign: "left",
    background: selected ? "var(--skin-accent-soft)" : "var(--skin-surface)",
    border: `1px solid ${selected ? "var(--skin-accent)" : "var(--skin-line-soft)"}`,
    borderRadius: "var(--xr-lg)",
    padding: "12px 13px",
    cursor: "pointer",
  };
}

function deltaColor(delta: number): string {
  if (delta > 0) return "var(--skin-good)";
  if (delta < 0) return "var(--skin-bad)";
  return "var(--skin-ink-faint)";
}

function deltaText(delta: number): string {
  if (delta > 0) return `+${delta}%`;
  if (delta < 0) return `${delta}%`;
  return "±0%";
}

export function ProjectSelectorStrip({
  selectedProjectId,
  onSelect,
}: {
  selectedProjectId: string | null;
  onSelect: (projectId: string | null) => void;
}) {
  const ranked = getRankedPortfolio();

  return (
    <div
      style={{
        display: "flex",
        gap: 9,
        overflowX: "auto",
        padding: "2px 2px 12px",
        scrollbarWidth: "thin",
      }}
    >
      <button
        type="button"
        aria-pressed={selectedProjectId === null}
        onClick={() => onSelect(null)}
        style={tileStyle(selectedProjectId === null)}
      >
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "var(--skin-ink)",
            marginBottom: 7,
            minHeight: 34,
          }}
        >
          All projects
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 7 }}>
          <span className="num" style={{ fontSize: 17, fontWeight: 600, color: "var(--skin-ink)" }}>
            {ranked.length}
          </span>
          <span style={{ fontSize: 12, color: "var(--skin-ink-faint)" }}>in portfolio</span>
        </div>
        <div style={{ fontSize: 11.5, color: "var(--skin-ink-faint)", marginTop: 6 }}>
          Everything you follow
        </div>
      </button>

      {ranked.map((entry) => {
        const project = getProjectById(entry.projectId);
        if (!project) return null;
        const selected = selectedProjectId === entry.projectId;
        return (
          <button
            key={entry.projectId}
            type="button"
            aria-pressed={selected}
            onClick={() => onSelect(selected ? null : entry.projectId)}
            style={tileStyle(selected)}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 13,
                fontWeight: 600,
                color: "var(--skin-ink)",
                lineHeight: 1.3,
                marginBottom: 7,
                minHeight: 34,
              }}
            >
              <span
                aria-hidden
                style={{
                  width: 8,
                  height: 8,
                  flexShrink: 0,
                  borderRadius: "50%",
                  background: project.color,
                }}
              />
              {project.name}
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 7 }}>
              <span
                className="num"
                style={{ fontSize: 17, fontWeight: 600, color: "var(--skin-ink)" }}
              >
                {entry.performanceScore}
              </span>
              <span
                className="num"
                style={{ fontSize: 12, color: deltaColor(entry.performanceDeltaPct) }}
              >
                {deltaText(entry.performanceDeltaPct)}
              </span>
            </div>
            <div style={{ fontSize: 11.5, color: "var(--skin-ink-faint)", marginTop: 6 }}>
              {project.tags[0] ?? project.status}
            </div>
          </button>
        );
      })}
    </div>
  );
}
