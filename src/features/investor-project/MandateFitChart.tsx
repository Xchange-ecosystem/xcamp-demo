// src/features/investor-project/MandateFitChart.tsx
//
// Replaces the old hand-rolled MatchScoreTrendChart line/area sparkline
// (cross-persona glitches brief, item B) — reuses the same shared
// TimelineChart mechanism Founder Dashboard's task-progress chart is built
// on, instead of a second, similar chart implemented separately.
//
// Data-shape gap, flagged in Phase 0 rather than papered over: Founder's
// chart has a real daily history it can bucket into day/week/month, three
// independent status counts to stack, and a separate quality-over-time
// series to overlay as a line. Investor's real data
// (PortfolioEntry.scores, src/fixtures/portfolio.ts) is only 8
// pre-aggregated weekly points of a single "mandate fit" metric — no daily
// granularity to zoom into, no second time series to draw as a line. Rather
// than invent either, this renders through the exact same TimelineChart
// component with no bars, no granularity control, and its `line` rendered
// as a gradient-fill area (TimelineChart's `lineArea` prop) — those props
// are simply omitted/set, which TimelineChart supports directly.
//
// Mandate-fit-chart-fix brief (2026-09-13): the original single-bar-stack
// rendering, against TimelineChart's implicit 0-based bar axis, made a real
// +8-over-8-weeks move look nearly flat. Two changes: bar -> gradient area,
// and a y-axis zoomed to a padded band around this project's own score
// range instead of the full 0-100 (or 0-derived-max) scale.
import { PORTFOLIO_WEEKS } from "@/fixtures/portfolio";
import { TimelineChart, type TimelinePoint } from "@/components/demo/charts/TimelineChart";

const FIT_COLOR = "var(--skin-accent)";

// Clean-tick-step padding: round the data's min/max outward to the nearest
// multiple of `step`, then widen further if that rounding left less than a
// quarter-step of breathing room on either side (e.g. the data's max
// already sits on a tick) — otherwise the line would touch the plot edge.
// Guarantees at least `minSpan` of vertical range so a near-flat series
// doesn't get zoomed into a jagged, meaningless sawtooth. Clamped to
// [0, 100] since these are percentage scores.
function paddedScoreDomain(scores: number[], step = 5, minSpan = step * 2): [number, number] {
  const dataMin = Math.min(...scores);
  const dataMax = Math.max(...scores);
  let lo = Math.floor(dataMin / step) * step;
  let hi = Math.ceil(dataMax / step) * step;
  if (dataMin - lo < step * 0.25) lo -= step;
  if (hi - dataMax < step * 0.25) hi += step;
  if (hi - lo < minSpan) {
    const mid = (hi + lo) / 2;
    lo = Math.floor((mid - minSpan / 2) / step) * step;
    hi = Math.ceil((mid + minSpan / 2) / step) * step;
  }
  return [Math.max(0, lo), Math.min(100, hi)];
}

export function MandateFitChart({ scores }: { scores: number[] }) {
  const data: TimelinePoint[] = PORTFOLIO_WEEKS.map((week, i) => ({
    date: week,
    fit: scores[i] ?? 0,
  }));
  const last = scores[scores.length - 1];
  const first = scores[0];
  const delta = last - first;

  return (
    <TimelineChart
      title="Mandate fit over time"
      subtitle={`${delta >= 0 ? "+" : ""}${delta} over ${PORTFOLIO_WEEKS.length} weeks — currently ${last}%.`}
      data={data}
      bars={[]}
      line={{ key: "fit", label: "Mandate fit", color: FIT_COLOR }}
      lineDomain={paddedScoreDomain(scores)}
      lineArea
      formatDate={(d) => d}
      height={180}
    />
  );
}
