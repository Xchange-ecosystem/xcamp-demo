import { createFileRoute } from "@tanstack/react-router";
import { LayoutDashboard } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ComingSoonPage } from "@/components/ComingSoonPage";

// Renders for every persona on direct navigation — nav visibility (investor-only,
// see AppSidebarExperimental) is presentation only and never gates the route itself.
export const Route = createFileRoute("/ecosystem-dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Xcamp" },
      { name: "description", content: "Portfolio-wide analytics — coming soon." },
    ],
  }),
  component: EcosystemDashboardPage,
});

function EcosystemDashboardPage() {
  return (
    <AppShell>
      <ComingSoonPage
        icon={LayoutDashboard}
        title="Dashboard"
        subtitle="Portfolio-wide analytics and reporting — coming soon."
      />
    </AppShell>
  );
}
