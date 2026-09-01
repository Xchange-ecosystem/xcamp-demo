import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/auth";
import { fetchProjectDashboardMetrics } from "@/lib/dashboard-metrics-api";
import {
  fetchFilteredObjectiveMetricsTimeline,
  fetchObjectiveMetricsSnapshot,
  fetchProjectMetricsTimeline,
  fetchProjectSnapshotBounds,
} from "@/lib/dashboard-snapshots-api";
import {
  EMPTY_OBJECTIVE_FILTER,
  fetchProjectObjectivesMeta,
  isFilterActive,
  objectiveMatchesFilter,
  type ObjectiveFilterState,
} from "@/lib/objective-filters";
import { MetricCard, StatRow, fmt } from "@/components/project-home/MetricPrimitives";
import { ProjectMetricsTimeline } from "@/components/project-home/ProjectMetricsTimeline";
import { ObjectiveMetricsDotPlot } from "@/components/project-home/ObjectiveMetricsDotPlot";
import { ObjectiveFiltersBar } from "@/components/project-home/ObjectiveFiltersBar";

// Founder-facing "Dashboard" tab on project details. Numbers over charts for
// the headline totals — per the brief, simple counts read better as numbers
// than charts. The timeline + dot plot below read from
// `objective_metrics_daily` / `project_metrics_daily`, both real and live
// (verified directly against the DB — see dashboard-snapshots-api.ts for why
// the previous session's "tables don't exist" finding was wrong: it checked
// committed migrations rather than the live schema).
//
// Dimension/category/status filters (Decision 2, CC follow-up to PR #130)
// combine with the date range as AND and apply to both the timeline and the
// dot plot.
export function FounderProjectDashboard({ projectId }: { projectId: string }) {
  const { user } = useAuth();

  const { data: metrics, isLoading } = useQuery({
    queryKey: ["project-dashboard-metrics", projectId],
    queryFn: () => fetchProjectDashboardMetrics(user!, projectId),
    enabled: !!user,
  });

  const { data: bounds } = useQuery({
    queryKey: ["project-snapshot-bounds", projectId],
    queryFn: () => fetchProjectSnapshotBounds(user!, projectId),
    enabled: !!user,
  });

  const { data: objectivesMeta = [] } = useQuery({
    queryKey: ["project-objectives-meta", projectId],
    queryFn: () => fetchProjectObjectivesMeta(user!, projectId),
    enabled: !!user,
  });

  // Date range — the baseline filter — plus dimension/category/status
  // (Decision 2), combined as AND.
  const [fromDate, setFromDate] = useState<string | null>(null);
  const [toDate, setToDate] = useState<string | null>(null);
  useEffect(() => {
    if (bounds && fromDate === null && toDate === null) {
      setFromDate(bounds.min);
      setToDate(bounds.max);
    }
  }, [bounds, fromDate, toDate]);

  const [filter, setFilter] = useState<ObjectiveFilterState>(EMPTY_OBJECTIVE_FILTER);
  const filterActive = isFilterActive(filter);

  const range = fromDate && toDate ? { from: fromDate, to: toDate } : null;

  const filteredObjectives = useMemo(
    () => objectivesMeta.filter((o) => objectiveMatchesFilter(o, filter)),
    [objectivesMeta, filter],
  );
  const filteredObjectiveIds = useMemo(
    () => filteredObjectives.map((o) => o.id),
    [filteredObjectives],
  );

  const { data: unfilteredTimeline = [], isLoading: unfilteredTimelineLoading } = useQuery({
    queryKey: ["project-metrics-timeline", projectId, range?.from, range?.to],
    queryFn: () => fetchProjectMetricsTimeline(user!, projectId, range!),
    enabled: !!user && !!range && !filterActive,
  });
  const { data: filteredTimeline = [], isLoading: filteredTimelineLoading } = useQuery({
    queryKey: [
      "project-metrics-timeline-filtered",
      projectId,
      range?.from,
      range?.to,
      filteredObjectiveIds,
    ],
    queryFn: () => fetchFilteredObjectiveMetricsTimeline(user!, filteredObjectives, range!),
    enabled: !!user && !!range && filterActive,
  });
  const timeline = filterActive ? filteredTimeline : unfilteredTimeline;
  const timelineLoading = filterActive ? filteredTimelineLoading : unfilteredTimelineLoading;

  const { data: objectiveSnapshots = [], isLoading: dotPlotLoading } = useQuery({
    queryKey: ["objective-metrics-snapshot", projectId, range?.to],
    queryFn: () => fetchObjectiveMetricsSnapshot(user!, projectId, range!.to),
    enabled: !!user && !!range,
  });
  const filteredObjectiveSnapshots = useMemo(
    () => objectiveSnapshots.filter((s) => objectiveMatchesFilter(s, filter)),
    [objectiveSnapshots, filter],
  );

  if (isLoading || !metrics) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          color: "var(--skin-ink-soft)",
          padding: "24px 0",
        }}
      >
        <Loader2 size={16} className="animate-spin" />
        Loading metrics…
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
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

      {/* Date-range + dimension/category/status filters, shared by the
          timeline and the dot plot (AND'd together; the dot plot uses the
          range's end date as its "as of" snapshot). */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <label style={{ fontSize: 12, color: "var(--skin-ink-faint)" }}>From</label>
          <input
            type="date"
            className="x-input"
            value={fromDate ?? ""}
            min={bounds?.min}
            max={toDate ?? bounds?.max}
            onChange={(e) => setFromDate(e.target.value)}
            style={{ fontSize: 12, padding: "4px 8px" }}
          />
          <label style={{ fontSize: 12, color: "var(--skin-ink-faint)" }}>To</label>
          <input
            type="date"
            className="x-input"
            value={toDate ?? ""}
            min={fromDate ?? bounds?.min}
            max={bounds?.max}
            onChange={(e) => setToDate(e.target.value)}
            style={{ fontSize: 12, padding: "4px 8px" }}
          />
        </div>
        <ObjectiveFiltersBar objectives={objectivesMeta} filter={filter} onChange={setFilter} />
      </div>

      {!bounds ? (
        <p style={{ fontSize: 13, color: "var(--skin-ink-faint)", margin: 0 }}>
          No daily snapshots recorded for this project yet.
        </p>
      ) : (
        <>
          <div>
            <h4 className="x-preview-title">Timeline</h4>
            {timelineLoading ? (
              <Loader2
                size={14}
                className="animate-spin"
                style={{ color: "var(--skin-ink-faint)" }}
              />
            ) : (
              <ProjectMetricsTimeline data={timeline} />
            )}
          </div>

          <div>
            <h4 className="x-preview-title">Objective distribution</h4>
            {dotPlotLoading ? (
              <Loader2
                size={14}
                className="animate-spin"
                style={{ color: "var(--skin-ink-faint)" }}
              />
            ) : (
              <ObjectiveMetricsDotPlot
                snapshots={filteredObjectiveSnapshots}
                objectivesTotal={filteredObjectives.length}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}
