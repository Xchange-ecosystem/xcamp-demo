import { useMemo, useState } from "react";
import { getProjectById, INVESTOR_DEALS, type PortfolioDeal } from "@/fixtures";
import { getProjectsByEcosystem } from "@/fixtures";
import { PortfolioFilterAccordion } from "./PortfolioFilterAccordion";
import { DealProjectCard } from "./DealProjectCard";
import { DealDetailsSidepanel } from "./DealDetailsSidepanel";
import {
  DEFAULT_FILTER_STATE,
  matchesFilters,
  matchesTab,
  PORTFOLIO_TABS,
  type PortfolioFilterState,
  type PortfolioTabKey,
} from "./dealHelpers";

interface PortfolioDealsViewProps {
  ecosystemId: string;
  filters: PortfolioFilterState;
  onFiltersChange: (next: PortfolioFilterState) => void;
}

// Investor Portfolio View's six-tab, six-filter project list (session brief
// §2) — a new surface, not a literal port of the functional app's
// PortfolioView (which has a different tab set and no deal-term filters at
// all; see the Phase 0 audit). `filters` is owned by the parent screen so
// the "Match investment criteria %" lever can also drive
// RankedPortfolioBars' threshold marker above this section.
export function PortfolioDealsView({
  ecosystemId,
  filters,
  onFiltersChange,
}: PortfolioDealsViewProps) {
  const [tab, setTab] = useState<PortfolioTabKey>("all");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [openDealProjectId, setOpenDealProjectId] = useState<string | null>(null);

  const ecosystemProjectIds = useMemo(
    () => new Set(getProjectsByEcosystem(ecosystemId).map((p) => p.id)),
    [ecosystemId],
  );

  const dealsInEcosystem = useMemo(
    () => INVESTOR_DEALS.filter((d) => ecosystemProjectIds.has(d.projectId)),
    [ecosystemProjectIds],
  );

  // Counts reflect the active filters, same as visibleDeals below — a
  // count that ignored filters would show a number the tab's own card grid
  // wouldn't back up the moment you clicked it.
  const countsByTab = useMemo(() => {
    const counts: Record<PortfolioTabKey, number> = {
      all: 0,
      watchlist: 0,
      shortlist: 0,
      access: 0,
      dealflow: 0,
      invested: 0,
    };
    for (const deal of dealsInEcosystem) {
      if (!matchesFilters(deal, filters)) continue;
      for (const t of PORTFOLIO_TABS) {
        if (matchesTab(deal, t.key)) counts[t.key]++;
      }
    }
    return counts;
  }, [dealsInEcosystem, filters]);

  const visibleDeals: PortfolioDeal[] = useMemo(
    () => dealsInEcosystem.filter((d) => matchesTab(d, tab) && matchesFilters(d, filters)),
    [dealsInEcosystem, tab, filters],
  );

  const activeTabConfig = PORTFOLIO_TABS.find((t) => t.key === tab)!;
  const openDeal = openDealProjectId
    ? (dealsInEcosystem.find((d) => d.projectId === openDealProjectId) ?? null)
    : null;
  const openProject = openDealProjectId ? (getProjectById(openDealProjectId) ?? null) : null;

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
          marginBottom: 14,
        }}
      >
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {PORTFOLIO_TABS.map((t) => {
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                aria-pressed={active}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "7px 13px",
                  borderRadius: "var(--xr-pill, 999px)",
                  border: `1px solid ${active ? "var(--skin-accent)" : "var(--skin-line)"}`,
                  background: active ? "var(--skin-accent)" : "var(--skin-surface)",
                  color: active ? "var(--skin-on-accent)" : "var(--skin-ink-soft)",
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                {t.label}
                <span
                  className="num"
                  style={{
                    fontSize: 11,
                    opacity: 0.8,
                  }}
                >
                  {countsByTab[t.key]}
                </span>
              </button>
            );
          })}
        </div>

        <PortfolioFilterAccordion
          open={filtersOpen}
          onToggleOpen={() => setFiltersOpen((v) => !v)}
          filters={filters}
          onChange={onFiltersChange}
        />
      </div>

      {visibleDeals.length === 0 ? (
        <div
          style={{
            padding: "36px 16px",
            textAlign: "center",
            color: "var(--skin-ink-faint)",
            fontSize: 13,
            border: "1px dashed var(--skin-line)",
            borderRadius: "var(--xr-lg, 10px)",
          }}
        >
          No projects match these filters in this ecosystem yet.
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
            gap: 12,
          }}
        >
          {visibleDeals.map((deal) => {
            const project = getProjectById(deal.projectId);
            if (!project) return null;
            return (
              <DealProjectCard
                key={deal.projectId}
                project={project}
                deal={deal}
                onClick={() => setOpenDealProjectId(deal.projectId)}
              />
            );
          })}
        </div>
      )}

      <DealDetailsSidepanel
        project={openProject}
        deal={openDeal}
        ctaLabel={activeTabConfig.cta}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setOpenDealProjectId(null);
        }}
      />
    </div>
  );
}

export { DEFAULT_FILTER_STATE };
