import { createFileRoute } from "@tanstack/react-router";
import { Briefcase } from "lucide-react";
import { DemoShell } from "@/components/demo/DemoShell";
import type { DemoNavItem } from "@/components/demo/DemoNavRail";
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

// Investor only has one screen today — Navrail gets a single item pointing
// at their persona home. More screens (and a real multi-item Navrail) are
// deferred to a later session per Fabian's instruction.
const investorNavItems: DemoNavItem[] = [
  { to: "/demo/investor", label: "Portfolio", icon: Briefcase, exact: true },
];

function InvestorHomePage() {
  return (
    <DemoShell persona="investor" items={investorNavItems}>
      <InvestorPortfolioScreen />
    </DemoShell>
  );
}
