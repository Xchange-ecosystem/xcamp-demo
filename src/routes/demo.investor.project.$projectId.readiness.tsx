import { createFileRoute } from "@tanstack/react-router";
import { InvestorProjectReadiness } from "@/features/investor-project/InvestorProjectReadiness";

export const Route = createFileRoute("/demo/investor/project/$projectId/readiness")({
  head: () => ({ meta: [{ title: "Readiness — Xcamp" }] }),
  component: InvestorProjectReadinessPage,
});

function InvestorProjectReadinessPage() {
  const { projectId } = Route.useParams();
  return <InvestorProjectReadiness projectId={projectId} />;
}
