import { createFileRoute } from "@tanstack/react-router";
import { LayoutDashboard } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ComingSoonPage } from "@/components/ComingSoonPage";

// Renders for every persona on direct navigation — nav visibility (investor-only,
// see AppSidebarExperimental) is presentation only and never gates the route itself.
export const Route = createFileRoute("/project/$projectId_/project-dashboard")({
  head: () => ({
    meta: [
      { title: "Project Dashboard — Xcamp" },
      { name: "description", content: "Project analytics — coming soon." },
    ],
  }),
  component: ProjectDashboardPage,
});

function ProjectDashboardPage() {
  return (
    <AppShell>
      <ComingSoonPage
        icon={LayoutDashboard}
        title="Project Dashboard"
        subtitle="Project analytics and reporting — coming soon."
      />
    </AppShell>
  );
}
