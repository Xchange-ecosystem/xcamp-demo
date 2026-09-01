import { useMemo, useState } from "react";
import {
  OBJECTIVE_DOT_METRICS,
  objectiveDotMetricValue,
  type ObjectiveDotMetricKey,
  type ObjectiveMetricsSnapshot,
} from "@/lib/dashboard-snapshots-api";

// One dot per objective, positioned along a shared horizontal scale by the
// selected metric. Built as a simple labeled-track list rather than
// recharts' ScatterChart — a scatter plot needs two numeric axes, and this
// is fundamentally a 1D strip (one metric, one dimension); a row-per-objective
// track reads more clearly than forcing a categorical Y onto a scatter chart.
//
// Default metric is "Task count" — task_total is the one field guaranteed
// present on every snapshot row with no divide-by-zero derived math, unlike
// Completion % which needs a task count to mean anything. This default is a
// judgment call, not a confirmed one — flagging per the brief for Fabian to
// pick a different default if task count isn't the most useful one.
const DEFAULT_METRIC: ObjectiveDotMetricKey = "tasksTotal";

export function ObjectiveMetricsDotPlot({
  snapshots,
  objectivesTotal,
}: {
  snapshots: ObjectiveMetricsSnapshot[];
  /** Total objectives under the project, so we can say how many are missing a snapshot row. */
  objectivesTotal: number;
}) {
  const [metric, setMetric] = useState<ObjectiveDotMetricKey>(DEFAULT_METRIC);
  const metricDef = OBJECTIVE_DOT_METRICS.find((m) => m.key === metric)!;

  const rows = useMemo(() => {
    const withValue = snapshots.map((s) => ({
      snapshot: s,
      value: objectiveDotMetricValue(s, metric),
    }));
    return withValue.sort((a, b) => b.value - a.value);
  }, [snapshots, metric]);

  const maxValue = Math.max(1, ...rows.map((r) => r.value));
  const missing = Math.max(0, objectivesTotal - snapshots.length);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <label style={{ fontSize: 12, color: "var(--skin-ink-faint)" }}>Metric</label>
        <select
          className="x-input"
          value={metric}
          onChange={(e) => setMetric(e.target.value as ObjectiveDotMetricKey)}
          style={{ fontSize: 12, padding: "4px 8px" }}
        >
          {OBJECTIVE_DOT_METRICS.map((m) => (
            <option key={m.key} value={m.key}>
              {m.label}
            </option>
          ))}
        </select>
      </div>

      {rows.length === 0 ? (
        <p style={{ fontSize: 13, color: "var(--skin-ink-faint)", margin: 0 }}>
          No objectives have a snapshot yet for this date.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {rows.map(({ snapshot, value }) => {
            const pct = (value / maxValue) * 100;
            return (
              <div
                key={snapshot.objectiveId}
                style={{ display: "flex", alignItems: "center", gap: 10 }}
              >
                <span
                  className="truncate"
                  style={{ width: 160, flexShrink: 0, fontSize: 12, color: "var(--skin-ink)" }}
                  title={snapshot.objectiveTitle}
                >
                  {snapshot.objectiveTitle}
                </span>
                <div
                  style={{
                    position: "relative",
                    flex: 1,
                    height: 2,
                    background: "var(--skin-line)",
                    borderRadius: 1,
                  }}
                >
                  <div
                    title={`${metricDef.label}: ${value.toLocaleString(undefined, { maximumFractionDigits: 1 })}`}
                    style={{
                      position: "absolute",
                      left: `calc(${pct}% - 5px)`,
                      top: -4,
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      background: "var(--skin-accent)",
                      boxShadow: "0 0 0 2px var(--skin-surface)",
                    }}
                  />
                </div>
                <span
                  style={{
                    width: 48,
                    flexShrink: 0,
                    textAlign: "right",
                    fontSize: 12,
                    color: "var(--skin-ink-soft)",
                  }}
                >
                  {value.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {missing > 0 && (
        <p style={{ fontSize: 11, color: "var(--skin-ink-faint)", margin: 0 }}>
          {missing} objective{missing === 1 ? "" : "s"} not shown — no snapshot row yet (not the
          same as a zero value).
        </p>
      )}
    </div>
  );
}
