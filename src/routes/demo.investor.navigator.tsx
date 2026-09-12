import { createFileRoute } from "@tanstack/react-router";
import { Map } from "lucide-react";
import { ComingSoonPage } from "@/components/ComingSoonPage";

export const Route = createFileRoute("/demo/investor/navigator")({
  head: () => ({ meta: [{ title: "Ecosystem Navigator — Xcamp" }] }),
  component: EcosystemNavigatorPage,
});

function EcosystemNavigatorPage() {
  return (
    <ComingSoonPage
      icon={Map}
      title="Ecosystem Navigator"
      subtitle="This feature is not activated in the demo. Contact admin@xchange.eco."
    />
  );
}
