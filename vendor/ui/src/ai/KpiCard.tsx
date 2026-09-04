interface KpiCardProps {
  value: string | number;
  label: string;
  unit?: string;
  delta?: {
    value: number;
    direction: "up" | "down" | "flat";
  };
  gravity?: boolean;
  title?: string;
}

const DELTA_ICON: Record<string, string> = { up: "↑", down: "↓", flat: "→" };
const DELTA_COLOR: Record<string, string> = {
  up: "var(--chart-2)",
  down: "var(--color-destructive)",
  flat: "var(--skin-ink-faint)",
};

export function KpiCard({ value, label, unit, delta, title }: KpiCardProps) {
  return (
    <div
      style={{
        display: "inline-flex",
        flexDirection: "column",
        gap: 3,
        padding: "10px 14px",
        borderRadius: 10,
        background: "var(--skin-surface)",
        border: "1px solid var(--skin-line-soft, var(--border))",
        minWidth: 110,
      }}
    >
      {title && (
        <p
          style={{
            margin: 0,
            fontSize: 11,
            color: "var(--skin-ink-faint)",
            fontWeight: 500,
          }}
        >
          {title}
        </p>
      )}
      <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
        <span
          style={{
            fontSize: 26,
            fontWeight: 700,
            color: "var(--skin-ink)",
            lineHeight: 1,
          }}
        >
          {value}
        </span>
        {unit && <span style={{ fontSize: 13, color: "var(--skin-ink-soft)" }}>{unit}</span>}
      </div>
      <span style={{ fontSize: 12, color: "var(--skin-ink-soft)" }}>{label}</span>
      {delta && (
        <span
          style={{
            fontSize: 11,
            color: DELTA_COLOR[delta.direction],
            fontWeight: 600,
          }}
        >
          {DELTA_ICON[delta.direction]} {delta.value > 0 ? "+" : ""}
          {delta.value}
        </span>
      )}
    </div>
  );
}
