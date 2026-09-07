import { createFileRoute } from "@tanstack/react-router";
import { Briefcase } from "lucide-react";
import { DemoShell } from "@/components/demo/DemoShell";
import type { DemoNavItem } from "@/components/demo/DemoNavRail";
import { InvestorPortfolioScreen } from "@/features/investor-portfolio/InvestorPortfolioScreen";

export const Route = createFileRoute("/demo/investor/portfolio")({
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

// Investor only has one screen today — Navrail gets a single item pointing
// at their persona home. More screens (and a real multi-item Navrail) are
// deferred to a later session per Fabian's instruction.
const investorNavItems: DemoNavItem[] = [
  { to: "/demo/investor", label: "Portfolio", icon: Briefcase, exact: true },
];

function InvestorPortfolioPage() {
  return (
    <DemoShell persona="investor" items={investorNavItems}>
      <InvestorPortfolioScreen />
    </DemoShell>
  );
}
