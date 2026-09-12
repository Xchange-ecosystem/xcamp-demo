import { useState } from "react";
import { getEcosystemById } from "@/fixtures";
import { useInvestorEcosystem } from "@/contexts/investor-ecosystem";
import { useInvestorMatchThreshold } from "@/contexts/investor-match-threshold";
import { PortfolioDealsView } from "./PortfolioDealsView";
import { DEFAULT_FILTER_STATE } from "./dealHelpers";
import type { PortfolioFilterState } from "./dealHelpers";

// Portfolio — its own page (session brief revision §3), split out of what
// used to be one page shared with Home's ranked bar chart (see
// InvestorHomeScreen.tsx). The six-tab, six-filter dealflow view
// (PortfolioDealsView) lives here; the only piece shared back with Home is
// the "Match investment criteria %" lever value, synced to
// useInvestorMatchThreshold so Home's mandate-threshold line reflects
// whatever this page's filter is set to. Every other filter field
// (risk/round/ask/ticket/club) stays local to this page.
export function InvestorPortfolioScreen() {
  const [ecosystemId] = useInvestorEcosystem();
  const { minMatchPct, setMinMatchPct } = useInvestorMatchThreshold();
  const ecosystem = getEcosystemById(ecosystemId);

  const [filters, setFilters] = useState<PortfolioFilterState>(() => ({
    ...DEFAULT_FILTER_STATE,
    minMatchPct,
  }));

  function handleFiltersChange(next: PortfolioFilterState) {
    setFilters(next);
    if (next.minMatchPct !== filters.minMatchPct) setMinMatchPct(next.minMatchPct);
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        minHeight: 0,
        overflowY: "auto",
        background: "var(--skin-bg)",
        padding: "28px 32px 60px",
      }}
    >
      <div style={{ marginBottom: 18 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "var(--skin-ink)" }}>
          Portfolio — {ecosystem?.name ?? "Ecosystem"}
        </h1>
        <p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--skin-ink-soft)" }}>
          Filter, label, and drill into projects in this ecosystem.
        </p>
      </div>

      <PortfolioDealsView
        ecosystemId={ecosystemId}
        filters={filters}
        onFiltersChange={handleFiltersChange}
      />
    </div>
  );
}
