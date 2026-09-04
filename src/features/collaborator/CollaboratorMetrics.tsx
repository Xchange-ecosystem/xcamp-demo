// P1.3 Part 2 — personal metrics tiles. Reuses MetricCard/StatRow/fmt from
// MetricPrimitives.tsx (shared with InvestorProjectMetrics and the founder
// dashboard) rather than building new tile chrome, so this reads as the same
// visual system. Every number here is derived straight from `assignments` —
// no invented percentages without a fixture backing them.
import { MetricCard, StatRow, fmt } from "@/components/project-home/MetricPrimitives";
import type { Assignment } from "@/fixtures/assignments";

export function CollaboratorMetrics({ assignments }: { assignments: Assignment[] }) {
  const active = assignments.filter((a) => a.workflowState !== "settled").length;
  const proofsFiled = assignments.filter(
    (a) => a.workflowState === "delivered" || a.workflowState === "settled",
  ).length;
  const settledCount = assignments.filter((a) => a.workflowState === "settled").length;

  return (
    <section>
      <h2 className="mb-2.5 text-sm font-semibold text-muted-foreground">My record</h2>
      <div className="flex flex-wrap gap-2">
        <MetricCard label="Active">
          <StatRow big={fmt(active, 0)} small="assignments in motion" />
        </MetricCard>
        <MetricCard label="Proofs filed">
          <StatRow big={fmt(proofsFiled, 0)} small="of work delivered" />
        </MetricCard>
        <MetricCard label="Settled">
          <StatRow big={fmt(settledCount, 0)} small="objectives certified" />
        </MetricCard>
      </div>
    </section>
  );
}
