import { createFileRoute } from "@tanstack/react-router";
import { LayoutDashboard } from "lucide-react";
import { ComingSoonPage } from "@/components/ComingSoonPage";

export const Route = createFileRoute("/demo/investor/project/$projectId/dashboard")({
  head: () => ({ meta: [{ title: "Project Dashboard — Xcamp" }] }),
  component: InvestorProjectDashboardPage,
});

function InvestorProjectDashboardPage() {
  return (
    <ComingSoonPage
      icon={LayoutDashboard}
      title="Project Dashboard"
      subtitle="This feature is not activated in the demo. Contact admin@xchange.eco."
    />
  );
}
