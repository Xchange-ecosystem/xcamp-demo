import {
  ResponsiveContainer,
  BarChart as RBarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Bar,
} from "recharts";

const TOKEN_MAP: Record<string, string> = {
  accent: "var(--skin-accent)",
  good: "var(--chart-2)",
  warn: "var(--chart-4)",
  danger: "var(--color-destructive)",
  primary: "var(--color-primary)",
};
const SKIN_PALETTE = [
  "var(--skin-accent)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];
const GRAVITY_PALETTE = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

function resolveColor(token: string | undefined, idx: number, gravity: boolean): string {
  if (token && TOKEN_MAP[token]) return TOKEN_MAP[token];
  const p = gravity ? GRAVITY_PALETTE : SKIN_PALETTE;
  return p[idx % p.length];
}

interface BarChartProps {
  x_key: string;
  series: Array<{ key: string; label: string; color_token?: string }>;
  data: Array<Record<string, string | number>>;
  y_label?: string;
  gravity?: boolean;
  title?: string;
}

const TICK_STYLE = { fontSize: 11, fill: "var(--skin-ink-soft)" };
const TOOLTIP_STYLE = {
  background: "var(--skin-surface)",
  border: "1px solid var(--skin-line-soft, var(--border))",
  borderRadius: 6,
  fontSize: 12,
  color: "var(--skin-ink)",
};

export function BarChart({ x_key, series, data, y_label, gravity = false, title }: BarChartProps) {
  return (
    <div style={{ width: "100%", padding: "12px 0" }}>
      {title && (
        <p style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 600, color: "var(--skin-ink)" }}>
          {title}
        </p>
      )}
      <ResponsiveContainer width="100%" height={180}>
        <RBarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--skin-line-soft, var(--border))"
            vertical={false}
          />
          <XAxis dataKey={x_key} tick={TICK_STYLE} axisLine={false} tickLine={false} />
          <YAxis
            tick={TICK_STYLE}
            axisLine={false}
            tickLine={false}
            width={40}
            label={
              y_label
                ? {
                    value: y_label,
                    angle: -90,
                    position: "insideLeft",
                    style: { fontSize: 11, fill: "var(--skin-ink-soft)" },
                  }
                : undefined
            }
          />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            cursor={{ fill: "var(--skin-surface2, var(--muted))", opacity: 0.5 }}
          />
          {series.length > 1 && (
            <Legend wrapperStyle={{ fontSize: 11, color: "var(--skin-ink-soft)" }} />
          )}
          {series.map((s, i) => (
            <Bar
              key={s.key}
              dataKey={s.key}
              name={s.label}
              fill={resolveColor(s.color_token, i, gravity)}
              radius={[3, 3, 0, 0]}
            />
          ))}
        </RBarChart>
      </ResponsiveContainer>
    </div>
  );
}
