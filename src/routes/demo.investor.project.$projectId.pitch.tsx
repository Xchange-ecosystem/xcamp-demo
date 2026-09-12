import { createFileRoute } from "@tanstack/react-router";
import { InvestorProjectPitch } from "@/features/investor-project/InvestorProjectPitch";

export const Route = createFileRoute("/demo/investor/project/$projectId/pitch")({
  head: () => ({ meta: [{ title: "Pitchdeck — Xcamp" }] }),
  component: InvestorProjectPitchPage,
});

function InvestorProjectPitchPage() {
  const { projectId } = Route.useParams();
  return <InvestorProjectPitch projectId={projectId} />;
}
