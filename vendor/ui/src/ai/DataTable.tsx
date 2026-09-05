interface DataTableProps {
  columns: Array<{
    key: string;
    label: string;
    align?: "left" | "right" | "center";
  }>;
  rows: Array<Record<string, unknown>>;
  max_rows_visible?: number;
  gravity?: boolean;
  title?: string;
}

export function DataTable({ columns, rows, max_rows_visible, title }: DataTableProps) {
  const visible = max_rows_visible != null ? rows.slice(0, max_rows_visible) : rows;
  const hiddenCount = max_rows_visible != null ? Math.max(0, rows.length - max_rows_visible) : 0;

  return (
    <div style={{ width: "100%" }}>
      {title && (
        <p style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 600, color: "var(--skin-ink)" }}>
          {title}
        </p>
      )}
      <div
        style={{
          overflowX: "auto",
          borderRadius: 8,
          border: "1px solid var(--skin-line-soft, var(--border))",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ background: "var(--skin-surface2, var(--muted))" }}>
              {columns.map((col) => (
                <th
                  key={col.key}
                  style={{
                    padding: "6px 10px",
                    textAlign: col.align ?? "left",
                    fontWeight: 600,
                    color: "var(--skin-ink-soft)",
                    borderBottom: "1px solid var(--skin-line-soft, var(--border))",
                    whiteSpace: "nowrap",
                  }}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((row, i) => (
              <tr
                key={i}
                style={{
                  background: i % 2 === 0 ? "transparent" : "var(--skin-surface, var(--muted))",
                }}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    style={{
                      padding: "5px 10px",
                      textAlign: col.align ?? "left",
                      color: "var(--skin-ink)",
                      borderBottom:
                        i < visible.length - 1
                          ? "1px solid var(--skin-line-soft, var(--border))"
                          : undefined,
                    }}
                  >
                    {String(row[col.key] ?? "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {hiddenCount > 0 && (
        <p style={{ margin: "6px 0 0", fontSize: 11, color: "var(--skin-ink-faint)" }}>
          +{hiddenCount} more rows
        </p>
      )}
    </div>
  );
}
