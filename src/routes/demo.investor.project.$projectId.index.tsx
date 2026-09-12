import { createFileRoute } from "@tanstack/react-router";
import { InvestorProjectHome } from "@/features/investor-project/InvestorProjectHome";

export const Route = createFileRoute("/demo/investor/project/$projectId/")({
  head: () => ({ meta: [{ title: "Project Home — Xcamp" }] }),
  component: InvestorProjectHomePage,
});

function InvestorProjectHomePage() {
  const { projectId } = Route.useParams();
  return <InvestorProjectHome projectId={projectId} />;
}
