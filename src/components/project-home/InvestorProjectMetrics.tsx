import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import type { ProjectDetailMetrics } from "@/lib/xcamp-api";
import {
  MOCK_QUALITY_PCT,
  MOCK_PROOF_TOTAL,
  MOCK_PROOF_AVG_PER_TASK,
  MOCK_MEMBERS_COLLABORATORS,
  MOCK_MEMBERS_VIEWERS,
} from "@/lib/investorMetricsMock";
import { MetricCard, MiniPie, StatRow } from "@/components/project-home/MetricPrimitives";

// Investor persona's Project Home replacement for the Tools row (Phase 5).
// Progress is the only real tile — everything else is mock, see investorMetricsMock.ts.

export function InvestorProjectMetrics({
  metrics,
  projectId,
}: {
  metrics: ProjectDetailMetrics;
  projectId: string;
}) {
  const proofAvg = MOCK_PROOF_AVG_PER_TASK.toLocaleString(undefined, { maximumFractionDigits: 1 });
  const membersTotal = MOCK_MEMBERS_COLLABORATORS + MOCK_MEMBERS_VIEWERS;

  return (
    <div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <MetricCard label="Progress">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <MiniPie
              value={metrics.openTasks}
              total={metrics.totalTasks}
              color="var(--skin-accent)"
            />
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "var(--skin-ink)" }}>
                {metrics.openTasks}/{metrics.totalTasks}
              </div>
              <div style={{ fontSize: 11, color: "var(--skin-ink-soft)" }}>tasks open</div>
            </div>
          </div>
        </MetricCard>

        <MetricCard label="Quality">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <MiniPie value={MOCK_QUALITY_PCT} total={100} color="var(--skin-accent)" />
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "var(--skin-ink)" }}>
                {MOCK_QUALITY_PCT}%
              </div>
              <div style={{ fontSize: 11, color: "var(--skin-ink-soft)" }}>quality score</div>
            </div>
          </div>
        </MetricCard>

        <MetricCard label="Proof">
          <StatRow
            big={MOCK_PROOF_TOTAL.toLocaleString()}
            small={`${MOCK_PROOF_TOTAL.toLocaleString()} total`}
          />
          <StatRow big={proofAvg} small="av. per task" />
        </MetricCard>

        <MetricCard label="Members">
          <StatRow
            big={membersTotal.toLocaleString()}
            small={`${MOCK_MEMBERS_COLLABORATORS} Collaborators`}
          />
          <StatRow big={MOCK_MEMBERS_VIEWERS.toLocaleString()} small="Viewers" />
        </MetricCard>
      </div>

      <Link
        to="/project/$projectId"
        params={{ projectId }}
        search={{ tab: "dashboard" }}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          marginTop: 12,
          fontSize: 12,
          fontWeight: 600,
          color: "var(--skin-accent)",
          textDecoration: "none",
        }}
      >
        See all metrics in the dashboard
        <ArrowRight size={12} />
      </Link>
    </div>
  );
}
