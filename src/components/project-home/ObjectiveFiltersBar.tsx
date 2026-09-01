import type { CSSProperties } from "react";
import {
  categoryOptions,
  dimensionOptions,
  type ObjectiveFilterState,
  type ObjectiveMeta,
} from "@/lib/objective-filters";

// Dimension / category / status filters for the founder dashboard's timeline
// + dot plot (Decision 2, CC follow-up to PR #130). Category cascades off
// the selected dimension — picking a dimension narrows the category list
// rather than showing every category across every dimension flat.
const STATUS_OPTIONS = ["active", "inactive", "completed"] as const;
const STATUS_LABELS: Record<string, string> = {
  active: "Active",
  inactive: "Inactive",
  completed: "Completed",
};

const selectStyle: CSSProperties = { fontSize: 12, padding: "4px 8px" };
const labelStyle: CSSProperties = { fontSize: 12, color: "var(--skin-ink-faint)" };

export function ObjectiveFiltersBar({
  objectives,
  filter,
  onChange,
}: {
  objectives: ObjectiveMeta[];
  filter: ObjectiveFilterState;
  onChange: (next: ObjectiveFilterState) => void;
}) {
  const dimOptions = dimensionOptions(objectives);
  const catOptions = categoryOptions(objectives, filter.dimension);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
      <label style={labelStyle}>Dimension</label>
      <select
        className="x-input"
        style={selectStyle}
        value={filter.dimension ?? ""}
        onChange={(e) => {
          const dimension = e.target.value || null;
          // Reset category when it no longer belongs to the newly-picked dimension.
          const stillValid =
            filter.category === null ||
            categoryOptions(objectives, dimension).some((c) => c.key === filter.category);
          onChange({ ...filter, dimension, category: stillValid ? filter.category : null });
        }}
      >
        <option value="">All dimensions</option>
        {dimOptions.map((o) => (
          <option key={o.key || "__none__"} value={o.key}>
            {o.label} ({o.count})
          </option>
        ))}
      </select>

      <label style={labelStyle}>Category</label>
      <select
        className="x-input"
        style={selectStyle}
        value={filter.category ?? ""}
        onChange={(e) => onChange({ ...filter, category: e.target.value || null })}
      >
        <option value="">All categories</option>
        {catOptions.map((o) => (
          <option key={o.key || "__none__"} value={o.key}>
            {o.label} ({o.count})
          </option>
        ))}
      </select>

      <label style={labelStyle}>Status</label>
      <select
        className="x-input"
        style={selectStyle}
        value={filter.status ?? ""}
        onChange={(e) => onChange({ ...filter, status: e.target.value || null })}
      >
        <option value="">All statuses</option>
        {STATUS_OPTIONS.map((s) => (
          <option key={s} value={s}>
            {STATUS_LABELS[s]}
          </option>
        ))}
      </select>
    </div>
  );
}
