import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { InvestorPortfolioScreen } from "@/features/investor-portfolio/InvestorPortfolioScreen";

export const Route = createFileRoute("/investor-portfolio")({
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
  return (
    <AppShell>
      <InvestorPortfolioScreen />
    </AppShell>
  );
}
