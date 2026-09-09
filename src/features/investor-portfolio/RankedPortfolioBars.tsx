import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Play, Square } from "lucide-react";
import { getProjectById, getRankedPortfolio } from "@/fixtures";
import { PORTFOLIO_WEEKS } from "@/fixtures/portfolio";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

// Part 1 — animated ranked portfolio bar list (P1.2 centerpiece), corrected
// in P1-CORR Part 2 to reorder against a real eight-week series
// (src/fixtures/portfolio.ts) instead of a single before/after transition.
//
// Reorder is driven by `transform: translateY(...)`, never by re-sorting
// `rows` — `rows` (built once, stable order and identity) is mapped
// directly; only `rank`, a separate per-week index lookup, changes. Rows
// keep their React key (`row.projectId`) across every week, so React only
// ever updates the existing DOM nodes' transform/width, never remounts or
// reorders them — that's what lets the browser interpolate the move.

const ROW_HEIGHT = 44;
const RANKS_MIN_WIDTH = 470; // sum of the row's fixed-width children + gaps
const LAST_WEEK = PORTFOLIO_WEEKS.length - 1;
const PLAY_INTERVAL_MS = 900;
const AUTOPLAY_DELAY_MS = 900;

interface Row {
  projectId: string;
  name: string;
  color: string;
  scores: number[]; // 8 weekly values, oldest first
}

function buildRows(): Row[] {
  return getRankedPortfolio().map((entry) => {
    const project = getProjectById(entry.projectId);
    return {
      projectId: entry.projectId,
      name: project?.name ?? entry.projectId,
      color: project?.color ?? "var(--skin-ink-faint)",
      scores: entry.scores,
    };
  });
}

function weekDelta(row: Row, week: number): number {
  if (week === 0) return 0;
  return row.scores[week] - row.scores[week - 1];
}

function deltaColor(delta: number): string {
  if (delta > 0) return "var(--skin-good)";
  if (delta < 0) return "var(--skin-bad)";
  return "var(--skin-ink-faint)";
}

function deltaText(delta: number): string {
  if (delta > 0) return `+${delta}`;
  if (delta < 0) return `${delta}`;
  return "±0";
}

export function RankedPortfolioBars({
  selectedProjectId,
  onSelect,
}: {
  selectedProjectId: string | null;
  onSelect: (projectId: string | null) => void;
}) {
  const rows = useMemo(buildRows, []);
  const prefersReducedMotion = usePrefersReducedMotion();

  const [{ week, playing }, setPlayback] = useState({
    week: prefersReducedMotion ? LAST_WEEK : 0,
    playing: false,
  });
  // Gates the fill width (and the score inside it) so bars grow in from
  // zero on first paint instead of appearing already full-width.
  const [revealed, setRevealed] = useState(prefersReducedMotion);

  const bootTimerRef = useRef<number | null>(null);

  const clearBootTimer = useCallback(() => {
    if (bootTimerRef.current !== null) {
      clearTimeout(bootTimerRef.current);
      bootTimerRef.current = null;
    }
  }, []);

  const stopPlay = useCallback(() => {
    setPlayback((current) => ({ ...current, playing: false }));
  }, []);

  const startPlay = useCallback(() => {
    if (prefersReducedMotion) {
      setPlayback({ week: LAST_WEEK, playing: false });
      return;
    }
    setPlayback({ week: 0, playing: true });
  }, [prefersReducedMotion]);

  // Boot: grow bars in from zero, then autoplay the eight weeks once — but
  // never under reduced motion, which renders the current week directly.
  useEffect(() => {
    if (prefersReducedMotion) return;
    let raf1 = 0;
    let raf2 = 0;
    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setRevealed(true));
    });
    bootTimerRef.current = window.setTimeout(() => {
      bootTimerRef.current = null;
      startPlay();
    }, AUTOPLAY_DELAY_MS);
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      clearBootTimer();
    };
    // Boot sequence runs once on mount only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      setPlayback((current) => {
        if (!current.playing) return current;
        const nextWeek = Math.min(current.week + 1, LAST_WEEK);
        return { week: nextWeek, playing: nextWeek < LAST_WEEK };
      });
    }, PLAY_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [playing]);

  useEffect(() => {
    if (!prefersReducedMotion) return;
    clearBootTimer();
    setRevealed(true);
    setPlayback({ week: LAST_WEEK, playing: false });
  }, [clearBootTimer, prefersReducedMotion]);

  const rank = useMemo(() => {
    const ordered = [...rows].sort((a, b) => b.scores[week] - a.scores[week]);
    return new Map(ordered.map((row, index) => [row.projectId, index]));
  }, [rows, week]);

  // Any direct interaction with the timeline controls cancels a pending
  // autoplay boot — it shouldn't yank the scrubber out from under someone
  // who already started exploring a specific week.
  const interruptBoot = useCallback(() => {
    clearBootTimer();
  }, [clearBootTimer]);

  const handleScrub = (value: number) => {
    interruptBoot();
    setPlayback({ week: Math.max(0, Math.min(LAST_WEEK, value)), playing: false });
  };

  const handlePlayToggle = () => {
    interruptBoot();
    if (playing) stopPlay();
    else startPlay();
  };

  const handleRowSelect = (projectId: string) => {
    interruptBoot();
    onSelect(selectedProjectId === projectId ? null : projectId);
  };

  const transformTransition = prefersReducedMotion
    ? "opacity .3s"
    : "transform .58s cubic-bezier(.22,.8,.2,1), opacity .3s";
  const fillTransition = prefersReducedMotion
    ? "background .3s"
    : "width .58s cubic-bezier(.22,.8,.2,1), background .3s";
  const markerTransition = prefersReducedMotion
    ? "none"
    : "left .58s cubic-bezier(.22,.8,.2,1), width .58s cubic-bezier(.22,.8,.2,1)";

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
            Bar length is match score. Watch eight weeks of movement, or drag to any week.
          </p>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
          <span
            style={{
              fontSize: 13,
              color: "var(--skin-ink-soft)",
              minWidth: 96,
              textAlign: "right",
            }}
          >
            Week of <b style={{ color: "var(--skin-ink)" }}>{PORTFOLIO_WEEKS[week]}</b>
          </span>
          <button
            type="button"
            onClick={handlePlayToggle}
            onFocus={(e) => {
              if (e.currentTarget.matches(":focus-visible")) {
                e.currentTarget.style.outline = "2px solid var(--skin-accent)";
                e.currentTarget.style.outlineOffset = "2px";
              }
            }}
            onBlur={(e) => {
              e.currentTarget.style.outline = "none";
            }}
            style={{
              all: "unset",
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
            {playing ? <Square size={14} aria-hidden /> : <Play size={14} aria-hidden />}
            {playing ? "Stop" : "Replay 8 weeks"}
          </button>
        </div>
      </div>

      <input
        type="range"
        min={0}
        max={LAST_WEEK}
        step={1}
        value={week}
        onChange={(e) => handleScrub(Number(e.target.value))}
        aria-label="Week"
        aria-valuetext={`Week of ${PORTFOLIO_WEEKS[week]}`}
        style={{ width: "100%", margin: "0 0 20px", accentColor: "var(--skin-accent)" }}
      />

      <div style={{ overflowX: "auto" }}>
        <div
          style={{
            position: "relative",
            height: rows.length * ROW_HEIGHT,
            minWidth: RANKS_MIN_WIDTH,
          }}
        >
          {rows.map((row) => {
            const index = rank.get(row.projectId) ?? 0;
            const rawScore = row.scores[week];
            const score = revealed ? rawScore : 0;
            const d = weekDelta(row, week);
            const selected = selectedProjectId === row.projectId;
            const dimmed = selectedProjectId !== null && !selected;

            const previousScore = week === 0 ? rawScore : row.scores[week - 1];
            const gainWidth = revealed && d > 0 ? d : 0;
            const gainLeft = previousScore;
            const pullbackWidth = revealed && d < 0 ? -d : 0;
            const pullbackLeft = rawScore;

            return (
              <div
                key={row.projectId}
                role="button"
                tabIndex={0}
                aria-pressed={selected}
                onClick={() => handleRowSelect(row.projectId)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleRowSelect(row.projectId);
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
                  transition: transformTransition,
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
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 7,
                    fontSize: 13.5,
                    fontWeight: selected ? 700 : 500,
                    color: "var(--skin-ink)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                  }}
                >
                  <span
                    aria-hidden
                    style={{
                      width: 8,
                      height: 8,
                      flexShrink: 0,
                      borderRadius: "50%",
                      background: row.color,
                    }}
                  />
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{row.name}</span>
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
                      zIndex: 1,
                      transition: fillTransition,
                    }}
                  >
                    <span
                      className="num"
                      style={{
                        paddingLeft: 9,
                        fontSize: 12.5,
                        fontWeight: 700,
                        color: dimmed ? "var(--skin-ink-soft)" : "var(--skin-on-accent)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {Math.round(score)}
                    </span>
                  </span>
                  {/* darker tip = this week's gain, siblings of the fill so
                      they aren't clipped by its overflow:hidden */}
                  <span
                    aria-hidden
                    style={{
                      position: "absolute",
                      top: 0,
                      bottom: 0,
                      left: `${gainLeft}%`,
                      width: `${gainWidth}%`,
                      background: "var(--skin-ink)",
                      opacity: 0.18,
                      borderRadius: "0 var(--xr) var(--xr) 0",
                      zIndex: 2,
                      pointerEvents: "none",
                      transition: markerTransition,
                    }}
                  />
                  {/* dashed edge = this week's pullback, past the fill entirely */}
                  <span
                    aria-hidden
                    style={{
                      position: "absolute",
                      top: 0,
                      bottom: 0,
                      left: `${pullbackLeft}%`,
                      width: `${pullbackWidth}%`,
                      borderTop: "1px dashed var(--skin-bad)",
                      borderBottom: "1px dashed var(--skin-bad)",
                      borderRight: "1px dashed var(--skin-bad)",
                      borderRadius: "0 var(--xr) var(--xr) 0",
                      pointerEvents: "none",
                      transition: markerTransition,
                    }}
                  />
                </span>
                <span
                  className="num"
                  style={{
                    width: 56,
                    textAlign: "right",
                    fontSize: 12.5,
                    fontWeight: 600,
                    flexShrink: 0,
                    color: deltaColor(d),
                  }}
                >
                  {deltaText(d)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
      <p style={{ margin: "14px 2px 0", fontSize: 12, color: "var(--skin-ink-faint)" }}>
        The darker tip of a bar is what it gained this week. A dashed edge past a bar is where it
        reached last week. The figure on the right is the exact change.
      </p>
    </div>
  );
}
