import { ECOSYSTEM_METRICS } from "@/fixtures";
import { MetricCard, StatRow } from "@/components/project-home/MetricPrimitives";

// Part 4 — right-column ecosystem metrics. Ecosystem-level aggregates
// (across the whole portfolio), distinct from InvestorProjectMetrics'
// single-project tiles. Reuses MetricPrimitives.tsx (MetricCard/StatRow)
// per the Phase 0 audit rather than building new tile primitives; unlike
// InvestorProjectMetrics, every value here comes from the real fixtures
// layer's ECOSYSTEM_METRICS, not investorMetricsMock.ts.
export function EcosystemMetricsPanel() {
  const m = ECOSYSTEM_METRICS;

  return (
    <div>
      <h2
        style={{
          margin: "0 0 11px",
          fontSize: 13,
          fontWeight: 600,
          color: "var(--skin-ink-soft)",
        }}
      >
        Ecosystem
      </h2>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <MetricCard label="Projects">
          <StatRow big={String(m.totalProjects)} small={`${m.activeProjects} active`} />
        </MetricCard>
        <MetricCard label="People">
          <StatRow big={String(m.totalPeople)} small="founders & collaborators" />
        </MetricCard>
        <MetricCard label="Objectives">
          <StatRow
            big={String(m.totalObjectives)}
            small={`${m.totalTasksCompleted} tasks completed`}
          />
        </MetricCard>
        <MetricCard label="Avg. progress">
          <StatRow big={`${m.avgProgressPct}%`} small="across active projects" />
        </MetricCard>
        <MetricCard label="Avg. quality">
          <StatRow big={`${m.avgQualityPct}%`} small="certified quality score" />
        </MetricCard>
      </div>
    </div>
  );
}
