import { Filter, X } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import {
  ALL_ROUNDS,
  ASK_RANGE_BOUNDS,
  CLUB_DEAL_BUCKETS,
  DEFAULT_FILTER_STATE,
  formatEUR,
  isFilterActive,
  ROUND_LABELS,
  RISK_LABELS,
  TICKET_RANGE_BOUNDS,
  type ClubDealBucket,
  type PortfolioFilterState,
} from "./dealHelpers";
import type { InvestmentRound } from "@/fixtures";

interface PortfolioFilterAccordionProps {
  open: boolean;
  onToggleOpen: () => void;
  filters: PortfolioFilterState;
  onChange: (next: PortfolioFilterState) => void;
}

function FilterRow({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "14px 0" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--skin-ink)" }}>{label}</span>
        {hint && <span style={{ fontSize: 12, color: "var(--skin-ink-faint)" }}>{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
        active
          ? "border-transparent"
          : "border-[var(--skin-line)] text-[var(--skin-ink-soft)] hover:text-[var(--skin-ink)]",
      )}
      style={
        active
          ? { background: "var(--skin-accent)", color: "var(--skin-on-accent)" }
          : { background: "var(--skin-surface)" }
      }
    >
      {children}
    </button>
  );
}

export function PortfolioFilterAccordion({
  open,
  onToggleOpen,
  filters,
  onChange,
}: PortfolioFilterAccordionProps) {
  const active = isFilterActive(filters);

  function toggleRound(round: InvestmentRound) {
    const has = filters.rounds.includes(round);
    onChange({
      ...filters,
      rounds: has ? filters.rounds.filter((r) => r !== round) : [...filters.rounds, round],
    });
  }

  function toggleClubDealBucket(bucket: ClubDealBucket) {
    onChange({
      ...filters,
      clubDealBucket: filters.clubDealBucket === bucket ? null : bucket,
    });
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button
          type="button"
          onClick={onToggleOpen}
          aria-expanded={open}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
            padding: "7px 12px",
            borderRadius: "var(--xr, 8px)",
            border: `1px solid ${active ? "var(--skin-accent)" : "var(--skin-line)"}`,
            background: active ? "var(--skin-accent-soft)" : "var(--skin-surface)",
            color: "var(--skin-ink)",
            fontSize: 13,
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          <Filter size={14} />
          Filters
          {active && (
            <span
              aria-hidden
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "var(--skin-accent)",
              }}
            />
          )}
        </button>
        {active && (
          <button
            type="button"
            onClick={() => onChange(DEFAULT_FILTER_STATE)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              fontSize: 12,
              color: "var(--skin-ink-faint)",
              background: "none",
              border: "none",
              cursor: "pointer",
            }}
          >
            <X size={12} />
            Reset filters
          </button>
        )}
      </div>

      {open && (
        <div
          style={{
            marginTop: 12,
            padding: "0 16px",
            borderRadius: "var(--xr-lg, 10px)",
            border: "1px solid var(--skin-line)",
            background: "var(--skin-surface)",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <FilterRow label="Match investment criteria" hint={`≥ ${filters.minMatchPct}%`}>
              <Slider
                value={[filters.minMatchPct]}
                min={0}
                max={100}
                step={1}
                onValueChange={([v]) => onChange({ ...filters, minMatchPct: v })}
              />
            </FilterRow>

            <div style={{ borderTop: "1px solid var(--skin-line-soft)" }} />

            <FilterRow
              label="Risk level"
              hint={`${RISK_LABELS[filters.riskRange[0] as 1 | 2 | 3 | 4 | 5]} – ${RISK_LABELS[filters.riskRange[1] as 1 | 2 | 3 | 4 | 5]}`}
            >
              <Slider
                value={filters.riskRange}
                min={1}
                max={5}
                step={1}
                onValueChange={([lo, hi]) => onChange({ ...filters, riskRange: [lo, hi] })}
              />
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 10.5,
                  color: "var(--skin-ink-faint)",
                }}
              >
                <span>Low</span>
                <span>High</span>
              </div>
            </FilterRow>

            <div style={{ borderTop: "1px solid var(--skin-line-soft)" }} />

            <FilterRow label="Club deals">
              <div style={{ display: "flex", gap: 6 }}>
                {CLUB_DEAL_BUCKETS.map((b) => (
                  <Pill
                    key={b.key}
                    active={filters.clubDealBucket === b.key}
                    onClick={() => toggleClubDealBucket(b.key)}
                  >
                    {b.label}
                  </Pill>
                ))}
              </div>
            </FilterRow>

            <div style={{ borderTop: "1px solid var(--skin-line-soft)" }} />

            <FilterRow label="Investment round">
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {ALL_ROUNDS.map((round) => (
                  <Pill
                    key={round}
                    active={filters.rounds.includes(round)}
                    onClick={() => toggleRound(round)}
                  >
                    {ROUND_LABELS[round]}
                  </Pill>
                ))}
              </div>
            </FilterRow>

            <div style={{ borderTop: "1px solid var(--skin-line-soft)" }} />

            <FilterRow
              label="Investment ask"
              hint={`${formatEUR(filters.askRange[0])} – ${formatEUR(filters.askRange[1])}`}
            >
              <Slider
                value={filters.askRange}
                min={ASK_RANGE_BOUNDS[0]}
                max={ASK_RANGE_BOUNDS[1]}
                step={50_000}
                onValueChange={([lo, hi]) => onChange({ ...filters, askRange: [lo, hi] })}
              />
            </FilterRow>

            <div style={{ borderTop: "1px solid var(--skin-line-soft)" }} />

            <FilterRow
              label="Ticket size"
              hint={`${formatEUR(filters.ticketRange[0])} – ${formatEUR(filters.ticketRange[1])}`}
            >
              <Slider
                value={filters.ticketRange}
                min={TICKET_RANGE_BOUNDS[0]}
                max={TICKET_RANGE_BOUNDS[1]}
                step={5_000}
                onValueChange={([lo, hi]) => onChange({ ...filters, ticketRange: [lo, hi] })}
              />
            </FilterRow>
          </div>
        </div>
      )}
    </div>
  );
}
