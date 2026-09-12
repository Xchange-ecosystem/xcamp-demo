import { useMemo, useState } from "react";
import { CardFeed } from "@/components/card-feed/CardFeed";
import { investorUpdateConfig } from "@/components/card-feed/configs";
import { getFeedByKind, getProjectById, getEcosystemById } from "@/fixtures";
import { useInvestorEcosystem } from "@/contexts/investor-ecosystem";
import { RankedPortfolioBars } from "./RankedPortfolioBars";
import { EcosystemMetricsPanel } from "./EcosystemMetricsPanel";
import { PortfolioDealsView } from "./PortfolioDealsView";
import { DEFAULT_FILTER_STATE } from "./dealHelpers";
import type { PortfolioFilterState } from "./dealHelpers";

// Below this width the 316px metrics aside plus the main column no longer
// both fit without the main column's content overlapping it, so the aside
// drops below the main column instead of sitting beside it.
const LAYOUT_STYLE = `
  .investor-portfolio-cols {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 316px;
    gap: 30px;
    align-items: start;
  }
  @media (max-width: 1024px) {
    .investor-portfolio-cols {
      grid-template-columns: 1fr;
    }
  }
`;

// Ecosystem-level landing page. RankedPortfolioBars keeps its original
// P1.2 8-project ranked view (those are the only projects with an 8-week
// score history — see fixtures/portfolio.ts); the Investor/Operator
// showcase session's new six-tab, filterable Portfolio View
// (PortfolioDealsView) sits below it, scoped to whichever ecosystem the nav
// switcher currently has selected. Both share `filters.minMatchPct` so the
// ranked bars' mandate-threshold line and the deals view's own filter stay
// in sync.
export function InvestorPortfolioScreen() {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [filters, setFilters] = useState<PortfolioFilterState>(DEFAULT_FILTER_STATE);
  const [ecosystemId] = useInvestorEcosystem();
  const ecosystem = getEcosystemById(ecosystemId);

  const updateItems = useMemo(() => getFeedByKind("project_update"), []);
  const feedItems = useMemo(
    () =>
      selectedProjectId
        ? updateItems.filter((item) => item.projectId === selectedProjectId)
        : updateItems,
    [updateItems, selectedProjectId],
  );

  const selectedProject = selectedProjectId ? getProjectById(selectedProjectId) : null;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        minHeight: 0,
        overflowY: "auto",
        background: "var(--skin-bg)",
      }}
    >
      <style>{LAYOUT_STYLE}</style>
      <div className="investor-portfolio-cols" style={{ padding: "28px 32px 60px" }}>
        <section>
          <RankedPortfolioBars
            selectedProjectId={selectedProjectId}
            onSelect={setSelectedProjectId}
            matchThresholdPct={filters.minMatchPct}
          />

          <div style={{ margin: "34px 0 12px", display: "flex", alignItems: "baseline", gap: 10 }}>
            <h2
              style={{
                margin: 0,
                fontSize: 15,
                fontWeight: 600,
                letterSpacing: "-0.01em",
                color: "var(--skin-ink)",
              }}
            >
              Portfolio — {ecosystem?.name ?? "Ecosystem"}
            </h2>
            <span style={{ color: "var(--skin-ink-faint)", fontSize: 13 }}>
              Filter, label, and drill into projects in this ecosystem
            </span>
          </div>
          <PortfolioDealsView
            ecosystemId={ecosystemId}
            filters={filters}
            onFiltersChange={setFilters}
          />

          <div style={{ margin: "30px 0 12px", display: "flex", alignItems: "baseline", gap: 10 }}>
            <h2
              style={{
                margin: 0,
                fontSize: 15,
                fontWeight: 600,
                letterSpacing: "-0.01em",
                color: "var(--skin-ink)",
              }}
            >
              {selectedProject
                ? `What changed in ${selectedProject.name}`
                : "What changed across the portfolio"}
            </h2>
            <span style={{ color: "var(--skin-ink-faint)", fontSize: 13 }}>
              {feedItems.length === 1 ? "1 update" : `${feedItems.length} updates`}
            </span>
          </div>
          <CardFeed items={feedItems} config={investorUpdateConfig} />
        </section>

        <aside style={{ display: "flex", flexDirection: "column", gap: 26 }}>
          <EcosystemMetricsPanel />
        </aside>
      </div>
    </div>
  );
}
