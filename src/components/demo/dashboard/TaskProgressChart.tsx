// src/components/demo/dashboard/TaskProgressChart.tsx
//
// Task-progress timeline for the Platform-altitude Dashboard, positioned
// above the existing metrics tiles (src/routes/demo.founder.dashboard.tsx).
// Charts TASKS status counts (inactive/active/completed — not Objective
// agreement status, no relabeling needed) with a quality line overlaid.
// Data comes from deriveTaskProgressTimeline.ts — a synthetic daily history
// walked backward from today's real TASKS snapshot and the project's real
// qualityPct (src/fixtures/metrics.ts), not an AI call or invented numbers.
//
// Recharts is already a repo dependency, used directly (not via the shadcn
// ChartContainer wrapper) elsewhere in the demo tree — see
// src/components/project-home/ProjectMetricsTimeline.tsx, whose styling
// conventions (CSS-var colors, ResponsiveContainer, styled Tooltip) this
// mirrors.
import { useMemo, useState } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  aggregateTimeline,
  generateDailyTaskProgressTimeline,
  type Granularity,
  type TimelinePoint,
} from "@/components/demo/dashboard/deriveTaskProgressTimeline";
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

function TooltipContent({
  active,
  payload,
  granularity,
}: {
  active?: boolean;
  payload?: { payload: TimelinePoint }[];
  granularity: Granularity;
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  const total = p.inactive + p.active + p.completed;
  return (
    <div
      style={{
        background: "var(--skin-surface)",
        border: "1px solid var(--skin-line)",
        borderRadius: 8,
        padding: "10px 12px",
        fontSize: 12,
        boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 6, color: "var(--skin-ink)" }}>
        {formatBucketLabel(p.date, granularity)}
      </div>
      {(["completed", "active", "inactive"] as const).map((key) => (
        <div
          key={key}
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 16,
            color: "var(--skin-ink-soft)",
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: 2,
                background: SEGMENT_COLOR[key],
                display: "inline-block",
              }}
            />
            {SEGMENT_LABEL[key]}
          </span>
          <b style={{ color: "var(--skin-ink)" }}>{p[key]}</b>
        </div>
      ))}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 16,
          marginTop: 4,
          paddingTop: 4,
          borderTop: "1px solid var(--skin-line)",
          color: "var(--skin-ink-soft)",
        }}
      >
        <span>Total tasks</span>
        <b style={{ color: "var(--skin-ink)" }}>{total}</b>
      </div>
      <div
        style={{ display: "flex", justifyContent: "space-between", gap: 16, color: QUALITY_COLOR }}
      >
        <span>Quality</span>
        <b>{p.quality}%</b>
      </div>
    </div>
  );
}

export function TaskProgressChart() {
  const [granularity, setGranularity] = useState<Granularity>("day");

  const daily = useMemo(() => generateDailyTaskProgressTimeline(DEMO_FOUNDER_PROJECT_ID), []);
  const data = useMemo(() => aggregateTimeline(daily, granularity), [daily, granularity]);

  return (
    <div className="mb-7 rounded-md p-4" style={{ background: "var(--skin-raised, var(--muted))" }}>
      <div className="mb-2 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Task progress over time</h2>
          <p className="text-xs text-muted-foreground">
            How Solari Energy's tasks have moved, with certified quality overlaid.
          </p>
        </div>
        <div
          style={{
            display: "flex",
            border: "1px solid var(--skin-line)",
            borderRadius: 8,
            overflow: "hidden",
          }}
        >
          {GRANULARITIES.map((g) => (
            <button
              key={g.key}
              type="button"
              onClick={() => setGranularity(g.key)}
              style={{
                padding: "5px 12px",
                fontSize: 12,
                fontWeight: granularity === g.key ? 600 : 400,
                border: "none",
                borderLeft: g.key === "day" ? "none" : "1px solid var(--skin-line)",
                background: granularity === g.key ? "var(--skin-accent)" : "transparent",
                color: granularity === g.key ? "#fff" : "var(--skin-ink-soft)",
                cursor: "pointer",
              }}
            >
              {g.label}
            </button>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={240}>
        <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="var(--skin-line)" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={(d: string) => formatBucketLabel(d, granularity)}
            tick={{ fontSize: 11, fill: "var(--skin-ink-faint)" }}
            axisLine={{ stroke: "var(--skin-line)" }}
            tickLine={false}
            minTickGap={24}
          />
          <YAxis
            yAxisId="count"
            allowDecimals={false}
            tick={{ fontSize: 11, fill: "var(--skin-ink-faint)" }}
            axisLine={false}
            tickLine={false}
            width={28}
          />
          <YAxis
            yAxisId="quality"
            orientation="right"
            domain={[0, 100]}
            tick={{ fontSize: 11, fill: "var(--skin-ink-faint)" }}
            axisLine={false}
            tickLine={false}
            width={32}
            tickFormatter={(v: number) => `${v}%`}
          />
          <Tooltip content={<TooltipContent granularity={granularity} />} />
          <Legend
            wrapperStyle={{ fontSize: 12, color: "var(--skin-ink-soft)" }}
            formatter={(value: string) => value}
          />
          <Bar
            yAxisId="count"
            dataKey="inactive"
            name={SEGMENT_LABEL.inactive}
            stackId="tasks"
            fill={SEGMENT_COLOR.inactive}
            isAnimationActive={false}
          />
          <Bar
            yAxisId="count"
            dataKey="active"
            name={SEGMENT_LABEL.active}
            stackId="tasks"
            fill={SEGMENT_COLOR.active}
            isAnimationActive={false}
          />
          <Bar
            yAxisId="count"
            dataKey="completed"
            name={SEGMENT_LABEL.completed}
            stackId="tasks"
            fill={SEGMENT_COLOR.completed}
            radius={[3, 3, 0, 0]}
            isAnimationActive={false}
          />
          <Line
            yAxisId="quality"
            dataKey="quality"
            name="Quality"
            stroke={QUALITY_COLOR}
            strokeWidth={2}
            dot={data.length <= 14}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
