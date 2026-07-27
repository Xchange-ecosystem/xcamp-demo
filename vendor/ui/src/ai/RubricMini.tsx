interface RubricMiniProps {
  dimensions: Array<{ label: string; score_pct: number }>;
  overall_pct?: number;
  gravity?: boolean;
  title?: string;
}

export function RubricMini({ dimensions, overall_pct, gravity = false, title }: RubricMiniProps) {
  const accent = gravity ? "var(--chart-2)" : "var(--skin-accent)";

  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 7 }}>
      {title && (
        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "var(--skin-ink)" }}>
          {title}
        </p>
      )}
      {dimensions.map((dim) => {
        const pct = Math.min(100, Math.max(0, dim.score_pct));
        return (
          <div key={dim.label}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 4,
              }}
            >
              <span style={{ fontSize: 12, color: "var(--skin-ink-soft)" }}>
                {dim.label}
              </span>
              <span
                style={{ fontSize: 12, fontWeight: 600, color: "var(--skin-ink)" }}
              >
                {dim.score_pct}%
              </span>
            </div>
            <div
              style={{
                height: 6,
                borderRadius: 3,
                background: "var(--skin-line-soft, var(--muted))",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${pct}%`,
                  background: accent,
                  borderRadius: 3,
                  transition: "width 0.4s ease",
                }}
              />
            </div>
          </div>
        );
      })}
      {overall_pct !== undefined && (
        <div
          style={{
            marginTop: 2,
            paddingTop: 7,
            borderTop: "1px solid var(--skin-line-soft, var(--border))",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--skin-ink)" }}>
            Overall
          </span>
          <span style={{ fontSize: 12, fontWeight: 700, color: accent }}>
            {overall_pct}%
          </span>
        </div>
      )}
    </div>
  );
}
