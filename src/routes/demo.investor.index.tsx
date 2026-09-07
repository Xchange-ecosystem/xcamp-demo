import { createFileRoute } from "@tanstack/react-router";
import { DemoShell } from "@/components/demo/DemoShell";
import { InvestorPortfolioScreen } from "@/features/investor-portfolio/InvestorPortfolioScreen";

// No dedicated investor home screen exists yet (see Phase 0 audit) — reuses
// InvestorPortfolioScreen, same as /demo/investor/portfolio, so /demo/investor
// resolves instead of 404ing.
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
  component: InvestorHomePage,
});

function InvestorHomePage() {
  return (
    <DemoShell>
      <InvestorPortfolioScreen />
    </DemoShell>
  );
}
