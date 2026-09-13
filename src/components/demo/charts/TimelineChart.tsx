// src/components/demo/charts/TimelineChart.tsx
//
// Shared, persona-agnostic timeline chart — stacked bar(s) with an optional
// overlaid line series, hover tooltip, and an optional granularity zoom
// toggle. Extracted from Founder Dashboard's TaskProgressChart (which
// shipped first, single-purpose) so Investor's Dashboard can reuse the same
// rendering mechanism for its own "mandate fit over time" data instead of
// two similar charts built separately (cross-persona glitches brief, item
// B). Callers own their own data shape/derivation and granularity state —
// this component only renders whatever bar/line series and buckets it's
// handed.
//
// Investor's real data (8 pre-aggregated weekly "mandate fit" values, one
// metric, no independent quality series) can't literally reproduce Founder's
// 3-segment stack + quality line + day/week/month zoom — that data simply
// doesn't exist for Investor (see MandateFitChart.tsx). Rather than invent
// it, Investor feeds this component a single-segment "stack" and omits the
// line/granularity props entirely; the component supports that (an
// undersized bars array and missing line/granularity props are valid, not
// special-cased) so both personas render through the exact same mechanism.
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

export interface TimelineSeriesSpec {
  key: string;
  label: string;
  color: string;
}

export type TimelinePoint = { date: string } & Record<string, number | string>;

export interface TimelineGranularityOption<G extends string> {
  key: G;
  label: string;
}

interface TooltipContentProps {
  active?: boolean;
  payload?: { payload: TimelinePoint }[];
  bars: TimelineSeriesSpec[];
  line?: TimelineSeriesSpec;
  totalLabel?: string;
  formatDate: (date: string) => string;
}

function TooltipContent({
  active,
  payload,
  bars,
  line,
  totalLabel,
  formatDate,
}: TooltipContentProps) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  const total = bars.reduce((sum, b) => sum + (Number(p[b.key]) || 0), 0);
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
        {formatDate(p.date)}
      </div>
      {bars.map((b) => (
        <div
          key={b.key}
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
                background: b.color,
                display: "inline-block",
              }}
            />
            {b.label}
          </span>
          <b style={{ color: "var(--skin-ink)" }}>{p[b.key]}</b>
        </div>
      ))}
      {bars.length > 1 && (
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
          <span>{totalLabel ?? "Total"}</span>
          <b style={{ color: "var(--skin-ink)" }}>{total}</b>
        </div>
      )}
      {line && (
        <div
          style={{ display: "flex", justifyContent: "space-between", gap: 16, color: line.color }}
        >
          <span>{line.label}</span>
          <b>{p[line.key]}</b>
        </div>
      )}
    </div>
  );
}

export interface TimelineChartProps<G extends string = string> {
  title: string;
  subtitle: string;
  data: TimelinePoint[];
  bars: TimelineSeriesSpec[];
  line?: TimelineSeriesSpec;
  lineDomain?: [number, number];
  lineTickFormatter?: (v: number) => string;
  formatDate: (date: string) => string;
  totalLabel?: string;
  /** Omit entirely for a chart with only one bucketing (no zoom control) —
   *  e.g. Investor's 8 fixed weekly points have nothing to zoom into. */
  granularity?: {
    options: TimelineGranularityOption<G>[];
    value: G;
    onChange: (value: G) => void;
  };
  height?: number;
}

export function TimelineChart<G extends string = string>({
  title,
  subtitle,
  data,
  bars,
  line,
  lineDomain = [0, 100],
  lineTickFormatter = (v) => `${v}%`,
  formatDate,
  totalLabel,
  granularity,
  height = 240,
}: TimelineChartProps<G>) {
  return (
    <div className="mb-7 rounded-md p-4" style={{ background: "var(--skin-raised, var(--muted))" }}>
      <div className="mb-2 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
        {granularity && (
          <div
            style={{
              display: "flex",
              border: "1px solid var(--skin-line)",
              borderRadius: 8,
              overflow: "hidden",
            }}
          >
            {granularity.options.map((g, i) => (
              <button
                key={g.key}
                type="button"
                onClick={() => granularity.onChange(g.key)}
                style={{
                  padding: "5px 12px",
                  fontSize: 12,
                  fontWeight: granularity.value === g.key ? 600 : 400,
                  border: "none",
                  borderLeft: i === 0 ? "none" : "1px solid var(--skin-line)",
                  background: granularity.value === g.key ? "var(--skin-accent)" : "transparent",
                  color: granularity.value === g.key ? "#fff" : "var(--skin-ink-soft)",
                  cursor: "pointer",
                }}
              >
                {g.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="var(--skin-line)" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
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
          {line && (
            <YAxis
              yAxisId="line"
              orientation="right"
              domain={lineDomain}
              tick={{ fontSize: 11, fill: "var(--skin-ink-faint)" }}
              axisLine={false}
              tickLine={false}
              width={32}
              tickFormatter={lineTickFormatter}
            />
          )}
          <Tooltip
            content={
              <TooltipContent
                bars={bars}
                line={line}
                totalLabel={totalLabel}
                formatDate={formatDate}
              />
            }
          />
          <Legend
            wrapperStyle={{ fontSize: 12, color: "var(--skin-ink-soft)" }}
            formatter={(value: string) => value}
          />
          {bars.map((b, i) => (
            <Bar
              key={b.key}
              yAxisId="count"
              dataKey={b.key}
              name={b.label}
              stackId="stack"
              fill={b.color}
              radius={i === bars.length - 1 ? [3, 3, 0, 0] : undefined}
              isAnimationActive={false}
            />
          ))}
          {line && (
            <Line
              yAxisId="line"
              dataKey={line.key}
              name={line.label}
              stroke={line.color}
              strokeWidth={2}
              dot={data.length <= 14}
              isAnimationActive={false}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
