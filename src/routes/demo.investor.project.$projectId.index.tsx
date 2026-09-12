import { createFileRoute } from "@tanstack/react-router";
import { Home } from "lucide-react";
import { ComingSoonPage } from "@/components/ComingSoonPage";

export const Route = createFileRoute("/demo/investor/project/$projectId/")({
  head: () => ({ meta: [{ title: "Project Home — Xcamp" }] }),
  component: InvestorProjectHomePage,
});

function InvestorProjectHomePage() {
  return (
    <ComingSoonPage
      icon={Home}
      title="Project Home"
      subtitle="This feature is not activated in the demo. Contact admin@xchange.eco."
    />
  );
}
