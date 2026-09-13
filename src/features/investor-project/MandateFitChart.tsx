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
// component with a single-segment "stack" (visually: one bar per week) and
// no line/no granularity control — those props are simply omitted, which
// TimelineChart supports directly.
import { PORTFOLIO_WEEKS } from "@/fixtures/portfolio";
import { TimelineChart, type TimelinePoint } from "@/components/demo/charts/TimelineChart";

const FIT_COLOR = "var(--skin-accent)";

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
      bars={[{ key: "fit", label: "Mandate fit", color: FIT_COLOR }]}
      formatDate={(d) => d}
      height={180}
    />
  );
}
