import { createFileRoute } from "@tanstack/react-router";
import { InvestorProjectDashboard } from "@/features/investor-project/InvestorProjectDashboard";

export const Route = createFileRoute("/demo/investor/project/$projectId/dashboard")({
  head: () => ({ meta: [{ title: "Project Dashboard — Xcamp" }] }),
  component: InvestorProjectDashboardPage,
});

function InvestorProjectDashboardPage() {
  const { projectId } = Route.useParams();
  return <InvestorProjectDashboard projectId={projectId} />;
}
