import { createFileRoute } from "@tanstack/react-router";
import { InvestorPortfolioScreen } from "@/features/investor-portfolio/InvestorPortfolioScreen";

// Ecosystem-level landing page — nav/shell now live one level up, in
// InvestorShell (src/routes/demo.investor.tsx), shared with every other
// /demo/investor/* route. See that file for why this session dropped the
// per-route duplicated DemoShell + nav array this route used to carry.
export const Route = createFileRoute("/demo/investor/")({
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
  component: InvestorPortfolioScreen,
});
