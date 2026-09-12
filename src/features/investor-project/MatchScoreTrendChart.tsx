import { PORTFOLIO_WEEKS } from "@/fixtures/portfolio";

// Investor Project Dashboard's "metrics development over time" chart
// (session brief revision §5 step 4 — "should visibly chart change... not
// just a snapshot, consistent with Home's 'ranked against your mandate
// over N weeks' framing"). Reuses PortfolioEntry.scores (the same 8-week
// series Home's ranked bars already animate) rather than authoring a
// parallel per-project time series — same week range, so Home and
// Dashboard read as one coherent timeline rather than two unrelated mocks,
// per the brief's own fixture-work note (§6).
const WIDTH = 560;
const HEIGHT = 140;
const PAD_X = 8;
const PAD_Y = 16;

function pointsFor(scores: number[]): string {
  const step = (WIDTH - PAD_X * 2) / (scores.length - 1);
  return scores
    .map((s, i) => {
      const x = PAD_X + i * step;
      const y = HEIGHT - PAD_Y - (s / 100) * (HEIGHT - PAD_Y * 2);
      return `${x},${y}`;
    })
    .join(" ");
}

export function MatchScoreTrendChart({ scores }: { scores: number[] }) {
  const points = pointsFor(scores);
  const areaPoints = `${PAD_X},${HEIGHT - PAD_Y} ${points} ${WIDTH - PAD_X},${HEIGHT - PAD_Y}`;
  const first = scores[0];
  const last = scores[scores.length - 1];
  const delta = last - first;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 8 }}>
        <span style={{ fontSize: 22, fontWeight: 700, color: "var(--skin-ink)" }}>{last}%</span>
        <span
          style={{
            fontSize: 12.5,
            fontWeight: 600,
            color: delta >= 0 ? "var(--skin-good)" : "var(--skin-bad)",
          }}
        >
          {delta >= 0 ? "+" : ""}
          {delta} over {PORTFOLIO_WEEKS.length} weeks
        </span>
      </div>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        width="100%"
        height={HEIGHT}
        preserveAspectRatio="none"
      >
        <polygon points={areaPoints} fill="var(--skin-accent-soft)" opacity={0.6} />
        <polyline points={points} fill="none" stroke="var(--skin-accent)" strokeWidth={2} />
      </svg>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 10.5,
          color: "var(--skin-ink-faint)",
          marginTop: 4,
        }}
      >
        <span>{PORTFOLIO_WEEKS[0]}</span>
        <span>{PORTFOLIO_WEEKS[PORTFOLIO_WEEKS.length - 1]}</span>
      </div>
    </div>
  );
}
