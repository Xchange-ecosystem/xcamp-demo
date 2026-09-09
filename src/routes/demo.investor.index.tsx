// Investor Home — activity-led counterpart to Dashboard (numbers-led) and
// Portfolio (performance-over-time). Deliberately shallow, same "secondary
// demo screen" pattern as the Founder Navigator/Dashboard views: it reuses
// the P1.0 CardFeed and its investorUpdateConfig rather than forking a feed.
//
// Before the B4 session this route rendered InvestorPortfolioScreen, because
// Portfolio was the persona's only screen. That screen now lives under
// MicroApps and Home is its own thing.
import { createFileRoute } from "@tanstack/react-router";
import { CardFeed } from "@/components/card-feed/CardFeed";
import { investorUpdateConfig } from "@/components/card-feed/configs";
import { getFeedByKind } from "@/fixtures/feed";
import { getRankedPortfolio } from "@/fixtures/portfolio";
import { getProjectById } from "@/fixtures/projects";

export const Route = createFileRoute("/demo/investor/")({
  head: () => ({
    meta: [
      { title: "Investor — Xcamp" },
      {
        name: "description",
        content: "What moved across the portfolio since you last looked.",
      },
    ],
  }),
  component: InvestorHomePage,
});

function InvestorHomePage() {
  const updates = getFeedByKind("project_update");
  const ranked = getRankedPortfolio();
  const climbing = ranked.filter((e) => e.performanceDeltaPct > 0).length;
  const topMover = ranked.slice().sort((a, b) => b.performanceDeltaPct - a.performanceDeltaPct)[0];
  const topMoverName = topMover ? getProjectById(topMover.projectId)?.name : null;

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
      <h1 className="mb-1.5 text-xl font-semibold tracking-tight text-foreground">
        What moved this week
      </h1>
      <p className="mb-6 text-sm text-muted-foreground">
        {climbing} of {ranked.length} projects gained ground
        {topMoverName ? `, ${topMoverName} furthest` : ""}. Full ranking sits in Portfolio.
      </p>

      <CardFeed items={updates} config={investorUpdateConfig} />
    </div>
  );
}
