import { useCallback, useEffect, useMemo, useState } from "react";
import { RotateCcw } from "lucide-react";
import { getProjectById, getRankedPortfolio } from "@/fixtures";

// Part 1 — animated ranked portfolio bar list (P1.2 centerpiece).
//
// PortfolioEntry only carries a current performanceScore + a single
// performanceDeltaPct vs. the previous period (see src/fixtures/portfolio.ts)
// — there's no multi-week series like the mockup's 8-week scrubber. Rather
// than inventing a fake weekly series, this derives one prior data point
// (previousScore = current - delta) from real fixture fields and animates
// the reorder + fill across that single before/after transition, replayable
// via the button below.

const ROW_HEIGHT = 44;

interface Row {
  projectId: string;
  name: string;
  currentScore: number;
  previousScore: number;
  deltaPct: number;
}

function buildRows(): Row[] {
  return getRankedPortfolio().map((entry) => {
    const project = getProjectById(entry.projectId);
    const previousScore = Math.max(
      0,
      Math.min(100, entry.performanceScore - entry.performanceDeltaPct),
    );
    return {
      projectId: entry.projectId,
      name: project?.name ?? entry.projectId,
      currentScore: entry.performanceScore,
      previousScore,
      deltaPct: entry.performanceDeltaPct,
    };
  });
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

export function RankedPortfolioBars({
  selectedProjectId,
  onSelect,
}: {
  selectedProjectId: string | null;
  onSelect: (projectId: string | null) => void;
}) {
  const rows = useMemo(buildRows, []);
  const [phase, setPhase] = useState<"previous" | "current">("previous");

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      setPhase("current");
      return;
    }
    const timer = setTimeout(() => setPhase("current"), 650);
    return () => clearTimeout(timer);
  }, []);

  const replay = useCallback(() => {
    setPhase("previous");
    requestAnimationFrame(() => requestAnimationFrame(() => setPhase("current")));
  }, []);

  const rank = useMemo(() => {
    const key = phase === "current" ? "currentScore" : "previousScore";
    const ordered = [...rows].sort((a, b) => b[key] - a[key]);
    return new Map(ordered.map((row, index) => [row.projectId, index]));
  }, [rows, phase]);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 16, marginBottom: 16 }}>
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: 24,
              fontWeight: 600,
              letterSpacing: "-0.02em",
              lineHeight: 1.15,
              color: "var(--skin-ink)",
              fontFamily: "var(--skin-font-head)",
            }}
          >
            {rows.length} projects, ranked against your mandate
          </h1>
          <p style={{ margin: "4px 0 0", fontSize: 13.5, color: "var(--skin-ink-soft)" }}>
            Bar length is match score. Darker tips show this period's gain, dashed edges show a
            pullback.
          </p>
        </div>
        <button
          type="button"
          onClick={replay}
          style={{
            all: "unset",
            marginLeft: "auto",
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            background: "var(--skin-accent)",
            color: "var(--skin-on-accent)",
            fontWeight: 600,
            fontSize: 13,
            padding: "8px 14px",
            borderRadius: "var(--xr-pill)",
            cursor: "pointer",
          }}
        >
          <RotateCcw size={14} aria-hidden />
          Replay
        </button>
      </div>

      <div style={{ position: "relative", height: rows.length * ROW_HEIGHT }}>
        {rows.map((row) => {
          const index = rank.get(row.projectId) ?? 0;
          const score = phase === "current" ? row.currentScore : row.previousScore;
          const selected = selectedProjectId === row.projectId;
          const dimmed = selectedProjectId !== null && !selected;

          return (
            <div
              key={row.projectId}
              role="button"
              tabIndex={0}
              aria-pressed={selected}
              onClick={() => onSelect(selected ? null : row.projectId)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelect(selected ? null : row.projectId);
                }
              }}
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                height: ROW_HEIGHT,
                display: "flex",
                alignItems: "center",
                gap: 13,
                padding: "0 2px",
                cursor: "pointer",
                opacity: dimmed ? 0.55 : 1,
                transform: `translateY(${index * ROW_HEIGHT}px)`,
                transition: "transform .58s cubic-bezier(.22,.8,.2,1), opacity .3s",
              }}
            >
              <span
                className="num"
                style={{
                  width: 19,
                  textAlign: "right",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "var(--skin-ink-faint)",
                }}
              >
                {index + 1}
              </span>
              <span
                style={{
                  width: 206,
                  flexShrink: 0,
                  fontSize: 13.5,
                  fontWeight: selected ? 700 : 500,
                  color: "var(--skin-ink)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {row.name}
              </span>
              <span
                style={{
                  position: "relative",
                  flex: 1,
                  minWidth: 150,
                  height: 22,
                  background: "var(--skin-line-soft)",
                  borderRadius: "var(--xr)",
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: `${score}%`,
                    background: dimmed ? "var(--skin-line)" : "var(--skin-accent)",
                    borderRadius: "var(--xr)",
                    display: "flex",
                    alignItems: "center",
                    overflow: "hidden",
                    transition: "width .58s cubic-bezier(.22,.8,.2,1), background .3s",
                  }}
                >
                  <span
                    className="num"
                    style={{
                      paddingLeft: 9,
                      fontSize: 12.5,
                      fontWeight: 700,
                      color: "var(--skin-on-accent)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {Math.round(score)}
                  </span>
                </span>
              </span>
              <span
                className="num"
                style={{
                  width: 56,
                  textAlign: "right",
                  fontSize: 12.5,
                  fontWeight: 600,
                  flexShrink: 0,
                  color: deltaColor(row.deltaPct),
                }}
              >
                {deltaText(row.deltaPct)}
              </span>
            </div>
          );
        })}
      </div>
      <p style={{ margin: "14px 2px 0", fontSize: 12, color: "var(--skin-ink-faint)" }}>
        The number on each bar is this period's match score. The figure on the right is the change
        since last period.
      </p>
    </div>
  );
}
