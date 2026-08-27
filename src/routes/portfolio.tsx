import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { PortfolioView } from "@/features/portfolio/PortfolioView";

export const Route = createFileRoute("/portfolio")({
  validateSearch: (search: Record<string, unknown>): { tab?: string } => ({
    ...(typeof search.tab === "string" ? { tab: search.tab } : {}),
  }),
  head: () => ({
    meta: [
      { title: "Portfolio — Xcamp" },
      { name: "description", content: "Browse and manage your projects." },
    ],
  }),
  component: PortfolioPage,
});

function PortfolioPage() {
  const { tab } = Route.useSearch();
  return (
    <AppShell>
      <PortfolioView initialTab={tab} />
    </AppShell>
  );
}
