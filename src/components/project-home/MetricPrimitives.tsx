import type { ReactNode } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";

// Shared rendering primitives for project/objective metric cards — used by
// InvestorProjectMetrics (existing) and the founder dashboard / objective
// sidepanel metrics (new), so both read as one visual system instead of two.

export function MiniPie({ value, total, color }: { value: number; total: number; color: string }) {
  const safeTotal = Math.max(total, 1);
  const data = [{ value: Math.min(value, safeTotal) }, { value: Math.max(safeTotal - value, 0) }];
  return (
    <ResponsiveContainer width={52} height={52}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          innerRadius={16}
          outerRadius={25}
          startAngle={90}
          endAngle={-270}
          stroke="none"
          isAnimationActive={false}
        >
          <Cell fill={color} />
          <Cell fill="var(--skin-line)" />
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  );
}

export function MetricCard({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div
      style={{
        flex: 1,
        minWidth: 130,
        border: "1px solid var(--skin-line)",
        borderRadius: 10,
        background: "var(--skin-card, var(--skin-surface))",
        padding: "14px 14px 12px",
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: "var(--skin-ink-faint)",
          marginBottom: 10,
        }}
      >
        {label}
      </div>
      {children}
    </div>
  );
}

export function StatRow({ big, small }: { big: string; small: string }) {
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ fontSize: 20, fontWeight: 700, color: "var(--skin-ink)", lineHeight: 1.1 }}>
        {big}
      </div>
      <div style={{ fontSize: 11, color: "var(--skin-ink-soft)" }}>{small}</div>
    </div>
  );
}

export function fmt(n: number, maxDecimals = 1): string {
  return n.toLocaleString(undefined, { maximumFractionDigits: maxDecimals });
}
