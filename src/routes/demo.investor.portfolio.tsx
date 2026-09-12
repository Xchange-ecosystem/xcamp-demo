import { createFileRoute } from "@tanstack/react-router";
import { InvestorPortfolioScreen } from "@/features/investor-portfolio/InvestorPortfolioScreen";

// Portfolio — its own page again (session brief revision §3), after an
// earlier pass conflated it with Home's ranked-bar-chart content on one
// route. Also the URL the real (non-demo) app's investor sidebar
// (AppSidebarExperimental.tsx's ECOSYSTEM_NAV "investor-portfolio" entry)
// links to directly, so this being a real page again (not a redirect) is a
// bonus fix, not just a rename.
export const Route = createFileRoute("/demo/investor/portfolio")({
  head: () => ({
    meta: [
      { title: "Portfolio — Xcamp" },
      {
        name: "description",
        content: "Filter, label, and drill into projects in this ecosystem.",
      },
    ],
  }),
  component: InvestorPortfolioScreen,
});
