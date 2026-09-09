// Portfolio — the existing, fixture-only Investor Portfolio screen, unchanged.
// B4 Phase 0 decision: this screen stays as-is rather than being rebuilt in
// the PortfolioProjectCard card-grid language that Club Deal Finder uses. The
// two answer different questions — ranked performance over an eight-week
// series here, pipeline movement there — and RankedPortfolioBars' timeline has
// no card equivalent to be rebuilt into.
import { createFileRoute } from "@tanstack/react-router";
import { InvestorPortfolioScreen } from "@/features/investor-portfolio/InvestorPortfolioScreen";

export const Route = createFileRoute("/demo/investor/microapps/portfolio")({
  head: () => ({
    meta: [
      { title: "Portfolio — Xcamp" },
      {
        name: "description",
        content:
          "Ranked portfolio, project updates, and ecosystem metrics for investors and operators.",
      },
    ],
  }),
  component: InvestorPortfolioPage,
});

function InvestorPortfolioPage() {
  return <InvestorPortfolioScreen />;
}
