import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ProjectMetricsSnapshot } from "@/lib/dashboard-snapshots-api";

// Small multiples — one metric per chart, single series, so there's never a
// dual-axis or a "which line is which" legend problem. Mirrors the same five
// metrics as FounderProjectDashboard's number cards, just as trends.
const TIMELINE_METRICS: { key: keyof ProjectMetricsSnapshot; label: string }[] = [
  { key: "objectivesCompleted", label: "Objectives completed" },
  { key: "tasksTotal", label: "Tasks total" },
  { key: "tasksCompletedTotal", label: "Tasks completed" },
  { key: "attachmentCountTotal", label: "Proof attachments" },
  { key: "linkedItemCountTotal", label: "Linked items" },
];

function formatDateShort(iso: string) {
  const d = new Date(`${iso}T00:00:00Z`);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function MiniLineChart({
  data,
  metricKey,
  label,
}: {
  data: ProjectMetricsSnapshot[];
  metricKey: keyof ProjectMetricsSnapshot;
  label: string;
}) {
  const chartData = data.map((d) => ({ date: d.snapshotDate, value: d[metricKey] as number }));
  const latest = chartData[chartData.length - 1]?.value ?? 0;

  return (
    <div
      style={{
        flex: "1 1 200px",
        minWidth: 200,
        border: "1px solid var(--skin-line)",
        borderRadius: 10,
        background: "var(--skin-card, var(--skin-surface))",
        padding: "12px 14px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          marginBottom: 6,
        }}
      >
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: "var(--skin-ink-faint)",
          }}
        >
          {label}
        </span>
        <span style={{ fontSize: 15, fontWeight: 700, color: "var(--skin-ink)" }}>
          {latest.toLocaleString(undefined, { maximumFractionDigits: 1 })}
        </span>
      </div>
      <ResponsiveContainer width="100%" height={64}>
        <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
          <XAxis
            dataKey="date"
            tickFormatter={formatDateShort}
            tick={{ fontSize: 10, fill: "var(--skin-ink-faint)" }}
            axisLine={{ stroke: "var(--skin-line)" }}
            tickLine={false}
            minTickGap={20}
          />
          <YAxis hide domain={[0, (max: number) => Math.max(max, 1)]} />
          <Tooltip
            formatter={(value: number) => [value.toLocaleString(), label]}
            labelFormatter={(d: string) => formatDateShort(d)}
            contentStyle={{
              background: "var(--skin-surface)",
              border: "1px solid var(--skin-line)",
              borderRadius: 6,
              fontSize: 12,
            }}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="var(--skin-accent)"
            strokeWidth={2}
            dot={chartData.length <= 14}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ProjectMetricsTimeline({ data }: { data: ProjectMetricsSnapshot[] }) {
  if (!data.length) {
    return (
      <p style={{ fontSize: 13, color: "var(--skin-ink-faint)", margin: 0 }}>
        No snapshots in this date range yet.
      </p>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {data.length < 5 && (
        <p style={{ fontSize: 12, color: "var(--skin-ink-faint)", margin: 0 }}>
          Only {data.length} day{data.length === 1 ? "" : "s"} of snapshots so far (
          {formatDateShort(data[0].snapshotDate)}
          {data.length > 1 ? `–${formatDateShort(data[data.length - 1].snapshotDate)}` : ""}) —
          trends will fill in as the daily job keeps running, this isn't a bug.
        </p>
      )}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        {TIMELINE_METRICS.map((m) => (
          <MiniLineChart key={m.key} data={data} metricKey={m.key} label={m.label} />
        ))}
      </div>
    </div>
  );
}
