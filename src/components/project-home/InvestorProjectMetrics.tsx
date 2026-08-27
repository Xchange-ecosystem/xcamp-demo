import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
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

// Investor persona's Project Home replacement for the Tools row (Phase 5).
// Progress is the only real tile — everything else is mock, see investorMetricsMock.ts.

function MiniPie({ value, total, color }: { value: number; total: number; color: string }) {
  const safeTotal = Math.max(total, 1);
  const data = [
    { value: Math.min(value, safeTotal) },
    { value: Math.max(safeTotal - value, 0) },
  ];
  return (
    <ResponsiveContainer width={52} height={52}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          innerRadius={16}
          outerRadius={25}
          startAngle={90}
          endAngle={-270}
          stroke="none"
          isAnimationActive={false}
        >
          <Cell fill={color} />
          <Cell fill="var(--skin-line)" />
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  );
}

function MetricCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        flex: 1,
        minWidth: 130,
        border: "1px solid var(--skin-line)",
        borderRadius: 10,
        background: "var(--skin-card, var(--skin-surface))",
        padding: "14px 14px 12px",
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: "var(--skin-ink-faint)",
          marginBottom: 10,
        }}
      >
        {label}
      </div>
      {children}
    </div>
  );
}

function StatRow({ big, small }: { big: string; small: string }) {
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ fontSize: 20, fontWeight: 700, color: "var(--skin-ink)", lineHeight: 1.1 }}>{big}</div>
      <div style={{ fontSize: 11, color: "var(--skin-ink-soft)" }}>{small}</div>
    </div>
  );
}

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
            <MiniPie value={metrics.openTasks} total={metrics.totalTasks} color="var(--skin-accent)" />
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
              <div style={{ fontSize: 16, fontWeight: 700, color: "var(--skin-ink)" }}>{MOCK_QUALITY_PCT}%</div>
              <div style={{ fontSize: 11, color: "var(--skin-ink-soft)" }}>quality score</div>
            </div>
          </div>
        </MetricCard>

        <MetricCard label="Proof">
          <StatRow big={MOCK_PROOF_TOTAL.toLocaleString()} small={`${MOCK_PROOF_TOTAL.toLocaleString()} total`} />
          <StatRow big={proofAvg} small="av. per task" />
        </MetricCard>

        <MetricCard label="Members">
          <StatRow big={membersTotal.toLocaleString()} small={`${MOCK_MEMBERS_COLLABORATORS} Collaborators`} />
          <StatRow big={MOCK_MEMBERS_VIEWERS.toLocaleString()} small="Viewers" />
        </MetricCard>
      </div>

      <Link
        to="/project/$projectId_/project-dashboard"
        params={{ projectId }}
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
