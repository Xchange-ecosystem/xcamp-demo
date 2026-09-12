import { useMemo, useState } from "react";
import { CardFeed } from "@/components/card-feed/CardFeed";
import { investorUpdateConfig } from "@/components/card-feed/configs";
import { getFeedByKind, getProjectById } from "@/fixtures";
import { useInvestorMatchThreshold } from "@/contexts/investor-match-threshold";
import { RankedPortfolioBars } from "./RankedPortfolioBars";
import { ProjectSelectorStrip } from "./ProjectSelectorStrip";
import { EcosystemMetricsPanel } from "./EcosystemMetricsPanel";

// Below this width the 316px metrics aside plus the main column no longer
// both fit without the main column's content overlapping it, so the aside
// drops below the main column instead of sitting beside it.
const LAYOUT_STYLE = `
  .investor-home-cols {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 316px;
    gap: 30px;
    align-items: start;
  }
  @media (max-width: 1024px) {
    .investor-home-cols {
      grid-template-columns: 1fr;
    }
  }
`;

// Investor persona's landing page (session brief revision §2) — the ranked
// bar chart + ecosystem summary + activity feed. Previously conflated with
// the six-tab Portfolio page (PortfolioDealsView) on one route labeled
// "Portfolio"; the brief's revision splits them into Home (this file) and
// Portfolio (InvestorPortfolioScreen.tsx), each its own nav item and route.
// The lightweight "All projects" + top-projects strip below the chart is
// this page's own quick-filter for the chart/feed below it — distinct from
// Portfolio's full filter accordion.
export function InvestorHomeScreen() {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const { minMatchPct } = useInvestorMatchThreshold();

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
      <div className="investor-home-cols" style={{ padding: "28px 32px 60px" }}>
        <section>
          <RankedPortfolioBars
            selectedProjectId={selectedProjectId}
            onSelect={setSelectedProjectId}
            matchThresholdPct={minMatchPct}
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
              Projects
            </h2>
            <span style={{ color: "var(--skin-ink-faint)", fontSize: 13 }}>
              Pick one to filter what's below
            </span>
          </div>
          <ProjectSelectorStrip
            selectedProjectId={selectedProjectId}
            onSelect={setSelectedProjectId}
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
