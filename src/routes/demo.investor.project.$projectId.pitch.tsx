import { createFileRoute } from "@tanstack/react-router";
import { Presentation } from "lucide-react";
import { ComingSoonPage } from "@/components/ComingSoonPage";

export const Route = createFileRoute("/demo/investor/project/$projectId/pitch")({
  head: () => ({ meta: [{ title: "Pitchdeck — Xcamp" }] }),
  component: InvestorProjectPitchPage,
});

function InvestorProjectPitchPage() {
  return (
    <ComingSoonPage
      icon={Presentation}
      title="Pitchdeck"
      subtitle="This feature is not activated in the demo. Contact admin@xchange.eco."
    />
  );
}
