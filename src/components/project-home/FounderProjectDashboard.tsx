import { useQuery } from "@tanstack/react-query";
import { Loader2, Clock3 } from "lucide-react";
import { useAuth } from "@/contexts/auth";
import { fetchProjectDashboardMetrics } from "@/lib/dashboard-metrics-api";
import { MetricCard, StatRow, fmt } from "@/components/project-home/MetricPrimitives";

// Founder-facing "Dashboard" tab on project details. Numbers over charts —
// per the brief, simple counts read better as numbers than charts here.
//
// Timeline of daily snapshots and the objective-metric dot plot (also asked
// for in the brief) are NOT built here: they read from
// `objective_metrics_daily` / `project_metrics_daily`, and neither table
// exists in the live schema yet (confirmed via the generated Supabase
// types — the backend session's daily-snapshot job, explicitly out of
// scope for this session, is what would create them). Building chart UI
// against tables that don't exist yet would mean either faking data or
// shipping a permanently-empty chart, so this is flagged instead — the
// panel below explains the blocker rather than pretending it's done.
export function FounderProjectDashboard({ projectId }: { projectId: string }) {
  const { user } = useAuth();

  const { data: metrics, isLoading } = useQuery({
    queryKey: ["project-dashboard-metrics", projectId],
    queryFn: () => fetchProjectDashboardMetrics(user!, projectId),
    enabled: !!user,
  });

  if (isLoading || !metrics) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--skin-ink-soft)", padding: "24px 0" }}>
        <Loader2 size={16} className="animate-spin" />
        Loading metrics…
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <MetricCard label="Objectives">
          <StatRow big={metrics.objectivesTotal.toLocaleString()} small="total" />
          <StatRow big={metrics.objectivesCompleted.toLocaleString()} small="completed" />
        </MetricCard>

        <MetricCard label="Tasks">
          <StatRow big={metrics.tasksTotal.toLocaleString()} small="total" />
          <StatRow big={fmt(metrics.tasksAvgPerObjective)} small="av. per objective" />
        </MetricCard>

        <MetricCard label="Tasks completed">
          <StatRow big={metrics.tasksCompletedTotal.toLocaleString()} small="total" />
          <StatRow big={fmt(metrics.tasksCompletedAvgPerObjective)} small="av. per objective" />
        </MetricCard>

        <MetricCard label="Proof">
          <StatRow big={metrics.proofAttachmentsTotal.toLocaleString()} small="attachments total" />
          <StatRow big={fmt(metrics.proofAttachmentsAvgPerObjective)} small="av. per objective" />
        </MetricCard>

        <MetricCard label="Linked items">
          <StatRow big={metrics.linkedItemsTotal.toLocaleString()} small="total" />
          <StatRow big={fmt(metrics.linkedItemsAvgPerObjective)} small="av. per objective" />
        </MetricCard>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 10,
          padding: "12px 14px",
          borderRadius: "var(--skin-radius, 10px)",
          border: "1px solid var(--skin-line)",
          background: "var(--skin-surface2)",
        }}
      >
        <Clock3 size={16} style={{ color: "var(--skin-ink-faint)", flexShrink: 0, marginTop: 2 }} />
        <p style={{ fontSize: 13, color: "var(--skin-ink-soft)", margin: 0, lineHeight: 1.5 }}>
          Daily snapshot timeline and the objective-metric distribution view are next — they read
          from <code>project_metrics_daily</code> / <code>objective_metrics_daily</code>, which the
          backend's daily-snapshot job hasn't created yet.
        </p>
      </div>
    </div>
  );
}
