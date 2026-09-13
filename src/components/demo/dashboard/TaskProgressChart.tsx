// src/components/demo/dashboard/TaskProgressChart.tsx
//
// Task-progress timeline for the Platform-altitude Founder Dashboard,
// positioned above the existing metrics tiles
// (src/routes/demo.founder.dashboard.tsx). Charts TASKS status counts
// (inactive/active/completed — not Objective agreement status, no
// relabeling needed) with a quality line overlaid. Data comes from
// deriveTaskProgressTimeline.ts — a synthetic daily history walked backward
// from today's real TASKS snapshot and the project's real qualityPct
// (src/fixtures/metrics.ts), not an AI call or invented numbers.
//
// This is now a thin persona-specific wrapper around the shared
// TimelineChart (cross-persona glitches brief, item B) — the actual
// stacked-bar/line/tooltip/zoom rendering lives there so Investor's
// Dashboard can reuse the same mechanism for its own data
// (MandateFitChart.tsx) instead of a second, similar chart built
// separately.
import { useMemo, useState } from "react";
import {
  aggregateTimeline,
  generateDailyTaskProgressTimeline,
  type Granularity,
} from "@/components/demo/dashboard/deriveTaskProgressTimeline";
import { TimelineChart, type TimelinePoint } from "@/components/demo/charts/TimelineChart";
import { DEMO_FOUNDER_PROJECT_ID } from "@/fixtures/pitch";

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

export function TaskProgressChart() {
  const [granularity, setGranularity] = useState<Granularity>("day");

  const daily = useMemo(() => generateDailyTaskProgressTimeline(DEMO_FOUNDER_PROJECT_ID), []);
  const data = useMemo(
    () => aggregateTimeline(daily, granularity) as unknown as TimelinePoint[],
    [daily, granularity],
  );

  return (
    <TimelineChart
      title="Task progress over time"
      subtitle="How Solari Energy's tasks have moved, with certified quality overlaid."
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
