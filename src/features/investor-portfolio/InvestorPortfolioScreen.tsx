import { useMemo, useState } from "react";
import { CardFeed } from "@/components/card-feed/CardFeed";
import { investorUpdateConfig } from "@/components/card-feed/configs";
import { getFeedByKind, getProjectById } from "@/fixtures";
import { RankedPortfolioBars } from "./RankedPortfolioBars";
import { ProjectSelectorStrip } from "./ProjectSelectorStrip";
import { EcosystemMetricsPanel } from "./EcosystemMetricsPanel";

// P1.2 — Investor/Operator Portfolio screen. Composes the four parts of the
// session brief: the ranked bar list and the selector strip share one
// `selectedProjectId` so either can drive the filter that Part 3's feed
// reads.
export function InvestorPortfolioScreen() {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

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
        minHeight: "100%",
        background: "var(--skin-bg)",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) 316px",
          gap: 30,
          padding: "28px 32px 60px",
          alignItems: "start",
        }}
      >
        <section>
          <RankedPortfolioBars
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
