import { useRef, useState } from "react";
import { Search, X, ArrowUpDown, ArrowUp, ArrowDown, SlidersHorizontal, Check } from "lucide-react";

export type ObjSortKey = "name" | "tasks" | "progress";
export type ObjGroupBy = "none" | "status";

export interface ToolbarState {
  search: string;
  statusFilter: string[];
  sort: ObjSortKey;
  sortDir: "asc" | "desc";
  groupBy: ObjGroupBy;
}

const SORT_LABELS: Record<ObjSortKey, string> = {
  name: "Name",
  tasks: "Task count",
  progress: "Progress",
};

const STATUS_OPTIONS = ["active", "inactive", "completed"] as const;

const STATUS_LABELS: Record<string, string> = {
  active: "Active",
  inactive: "Inactive",
  completed: "Completed",
};

export function ColumnToolbar({
  state,
  onChange,
}: {
  state: ToolbarState;
  onChange: (next: Partial<ToolbarState>) => void;
}) {
  const sortRef = useRef<HTMLDivElement>(null);
  const filtersRef = useRef<HTMLDivElement>(null);
  const [sortOpen, setSortOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const activeFilterCount = state.statusFilter.length + (state.groupBy !== "none" ? 1 : 0);

  const toggleStatus = (s: string) => {
    const next = state.statusFilter.includes(s)
      ? state.statusFilter.filter((x) => x !== s)
      : [...state.statusFilter, s];
    onChange({ statusFilter: next });
  };

  return (
    <div
      className="flex items-center gap-2 px-3 py-2"
      style={{ borderBottom: "1px solid var(--skin-line)", background: "var(--skin-surface)" }}
    >
      {/* Search */}
      <div style={{ position: "relative", flex: 1 }}>
        <Search
          size={13}
          style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", color: "var(--skin-ink-faint)", pointerEvents: "none" }}
        />
        <input
          className="x-input"
          style={{ paddingLeft: 26, paddingRight: state.search ? 26 : 8, height: 30, fontSize: 13, width: "100%" }}
          placeholder="Search objectives, tasks & notes…"
          value={state.search}
          onChange={(e) => onChange({ search: e.target.value })}
        />
        {state.search && (
          <button
            aria-label="Clear search"
            onClick={() => onChange({ search: "" })}
            style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--skin-ink-faint)", padding: 2, lineHeight: 0 }}
          >
            <X size={13} />
          </button>
        )}
      </div>

      {/* Sort */}
      <div ref={sortRef} style={{ position: "relative", flexShrink: 0 }}>
        <button
          className="x-btn-secondary"
          aria-label="Sort objectives"
          title={`Sort: ${SORT_LABELS[state.sort]} (${state.sortDir === "asc" ? "ascending" : "descending"})`}
          style={{ height: 30, width: 34, padding: 0, display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={() => { setSortOpen((v) => !v); setFiltersOpen(false); }}
        >
          <ArrowUpDown size={14} />
        </button>
        {sortOpen && (
          <div
            style={{
              position: "absolute", right: 0, top: 36, zIndex: 20, width: 180,
              background: "var(--skin-surface)", border: "1px solid var(--skin-line)",
              borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.18)", padding: 6,
            }}
          >
            {(Object.keys(SORT_LABELS) as ObjSortKey[]).map((k) => (
              <button
                key={k}
                onClick={() => { onChange({ sort: k }); setSortOpen(false); }}
                style={{
                  width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                  gap: 8, padding: "7px 8px", fontSize: 13, borderRadius: 6, border: "none", cursor: "pointer",
                  background: state.sort === k ? "var(--skin-surface2)" : "transparent",
                  color: "var(--skin-ink)",
                }}
              >
                {SORT_LABELS[k]}
                {state.sort === k && <Check size={13} style={{ color: "var(--skin-accent)" }} />}
              </button>
            ))}
            <div style={{ height: 1, background: "var(--skin-line)", margin: "5px 4px" }} />
            <button
              onClick={() => onChange({ sortDir: state.sortDir === "asc" ? "desc" : "asc" })}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "7px 8px",
                fontSize: 13, borderRadius: 6, border: "none", cursor: "pointer", background: "transparent", color: "var(--skin-ink)",
              }}
            >
              {state.sortDir === "asc" ? <ArrowUp size={13} /> : <ArrowDown size={13} />}
              {state.sortDir === "asc" ? "Ascending" : "Descending"}
            </button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div ref={filtersRef} style={{ position: "relative", flexShrink: 0 }}>
        <button
          className="x-btn-secondary"
          aria-label="Filter objectives"
          style={{
            height: 30, padding: "0 9px", display: "flex", alignItems: "center", gap: 5, fontSize: 12,
            borderColor: activeFilterCount ? "var(--skin-accent)" : undefined,
            color: activeFilterCount ? "var(--skin-accent)" : undefined,
          }}
          onClick={() => { setFiltersOpen((v) => !v); setSortOpen(false); }}
        >
          <SlidersHorizontal size={13} />
          Filters
          {activeFilterCount > 0 && (
            <span
              style={{
                minWidth: 15, height: 15, borderRadius: 8, fontSize: 10, fontWeight: 600,
                display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "0 3px",
                background: "var(--skin-accent)", color: "var(--skin-on-accent, #fff)",
              }}
            >
              {activeFilterCount}
            </span>
          )}
        </button>
        {filtersOpen && (
          <div
            style={{
              position: "absolute", right: 0, top: 36, zIndex: 20, width: 230,
              background: "var(--skin-surface)", border: "1px solid var(--skin-line)",
              borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.18)", padding: 12,
            }}
          >
            <span style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--skin-ink-faint)", marginBottom: 6 }}>
              Status
            </span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
              {STATUS_OPTIONS.map((s) => {
                const on = state.statusFilter.includes(s);
                return (
                  <button
                    key={s}
                    onClick={() => toggleStatus(s)}
                    style={{
                      fontSize: 12, padding: "3px 9px", borderRadius: 999, cursor: "pointer",
                      border: `1px solid ${on ? "var(--skin-accent)" : "var(--skin-line)"}`,
                      background: on ? "var(--skin-accent)" : "transparent",
                      color: on ? "var(--skin-on-accent, #fff)" : "var(--skin-ink)",
                    }}
                  >
                    {STATUS_LABELS[s]}
                  </button>
                );
              })}
            </div>

            <span style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--skin-ink-faint)", marginBottom: 6 }}>
              Group by
            </span>
            <div style={{ display: "flex", gap: 6, marginBottom: 4 }}>
              {(["none", "status"] as ObjGroupBy[]).map((g) => {
                const on = state.groupBy === g;
                return (
                  <button
                    key={g}
                    onClick={() => onChange({ groupBy: g })}
                    style={{
                      fontSize: 12, padding: "3px 9px", borderRadius: 999, cursor: "pointer",
                      border: `1px solid ${on ? "var(--skin-accent)" : "var(--skin-line)"}`,
                      background: on ? "var(--skin-accent)" : "transparent",
                      color: on ? "var(--skin-on-accent, #fff)" : "var(--skin-ink)",
                    }}
                  >
                    {g === "none" ? "None" : "Status"}
                  </button>
                );
              })}
            </div>

            {activeFilterCount > 0 && (
              <button
                onClick={() => onChange({ statusFilter: [], groupBy: "none" })}
                className="x-btn-secondary"
                style={{ height: 28, fontSize: 12, width: "100%", marginTop: 10 }}
              >
                Clear all filters
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
