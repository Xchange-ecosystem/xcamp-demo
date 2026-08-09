import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { PortfolioView } from "@/features/portfolio/PortfolioView";

export const Route = createFileRoute("/portfolio")({
  head: () => ({
    meta: [
      { title: "Portfolio — Xcamp" },
      { name: "description", content: "Browse and manage your projects." },
    ],
  }),
  component: PortfolioPage,
});

function PortfolioPage() {
  return (
    <AppShell>
      <PortfolioView />
    </AppShell>
  );
}
