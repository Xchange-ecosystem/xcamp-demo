// src/features/investor-project/ProjectProgressChart.tsx
//
// Investor's project-level drill-down chart for a portfolio company that
// has real per-task daily data (i.e. a src/fixtures/metrics.ts entry) —
// same underlying data source and TimelineChart mechanism as Founder
// Dashboard's TaskProgressChart (src/components/demo/dashboard/
// TaskProgressChart.tsx), parametrized by projectId instead of hardcoded to
// DEMO_FOUNDER_PROJECT_ID, with investor-flavored title/subtitle. Founder's
// own chart/file is untouched (this session's explicit non-goal) — the
// small presentation constants below (segment colors/labels, date
// formatting, granularity options) are intentionally duplicated rather than
// extracted into a shared module that would require editing that file.
//
// For a portfolio company with no metrics fixture, InvestorProjectDashboard
// falls back to MandateFitChart's reduced weekly aggregate instead of
// rendering this component — real daily per-task data doesn't exist for
// every company, and the honest-data principle this demo has followed
// argues for keeping that view visibly simpler there rather than inventing
// numbers (see MandateFitChart.tsx and this session's brief).
import { useMemo, useState } from "react";
import {
  aggregateTimeline,
  generateDailyTaskProgressTimeline,
  type Granularity,
} from "@/components/demo/dashboard/deriveTaskProgressTimeline";
import { TimelineChart, type TimelinePoint } from "@/components/demo/charts/TimelineChart";

const SEGMENT_COLOR: Record<"inactive" | "active" | "completed", string> = {
  inactive: "var(--skin-line)", // "Still a sketch"
  active: "var(--skin-accent)",
  completed: "var(--skin-good)",
};
const SEGMENT_LABEL: Record<"inactive" | "active" | "completed", string> = {
  inactive: "Still a sketch",
  active: "Active",
  completed: "Complete",
};
const QUALITY_COLOR = "var(--skin-warn)";

const GRANULARITIES: { key: Granularity; label: string }[] = [
  { key: "day", label: "Days" },
  { key: "week", label: "Weeks" },
  { key: "month", label: "Months" },
];

function formatBucketLabel(dateStr: string, granularity: Granularity): string {
  if (granularity === "month") {
    const [year, month] = dateStr.split("-");
    return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString(undefined, {
      month: "short",
      year: "2-digit",
    });
  }
  const d = new Date(`${dateStr}T00:00:00Z`);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function ProjectProgressChart({
  projectId,
  projectName,
}: {
  projectId: string;
  projectName: string;
}) {
  const [granularity, setGranularity] = useState<Granularity>("day");

  const daily = useMemo(() => generateDailyTaskProgressTimeline(projectId), [projectId]);
  const data = useMemo(
    () => aggregateTimeline(daily, granularity) as unknown as TimelinePoint[],
    [daily, granularity],
  );

  return (
    <TimelineChart
      title="Delivery progress over time"
      subtitle={`How ${projectName}'s work has actually moved, task by task, with certified quality overlaid — the same real signal shown on the founder's own dashboard.`}
      data={data}
      bars={[
        { key: "inactive", label: SEGMENT_LABEL.inactive, color: SEGMENT_COLOR.inactive },
        { key: "active", label: SEGMENT_LABEL.active, color: SEGMENT_COLOR.active },
        { key: "completed", label: SEGMENT_LABEL.completed, color: SEGMENT_COLOR.completed },
      ]}
      line={{ key: "quality", label: "Quality", color: QUALITY_COLOR }}
      totalLabel="Total tasks"
      formatDate={(d) => formatBucketLabel(d, granularity)}
      granularity={{ options: GRANULARITIES, value: granularity, onChange: setGranularity }}
    />
  );
}
