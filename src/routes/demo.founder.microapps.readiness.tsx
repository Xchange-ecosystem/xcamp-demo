// MicroApps scaffold (Pitch session) — placeholder. Readiness is designed
// (see docs/mockups/pitch-solari-mockup.html's sibling screens) but not
// built this session; this route exists only so the nav item resolves
// somewhere.
import { createFileRoute } from "@tanstack/react-router";
import { ClipboardCheck } from "lucide-react";
import { ComingSoonPage } from "@/components/ComingSoonPage";

export const Route = createFileRoute("/demo/founder/microapps/readiness")({
  head: () => ({ meta: [{ title: "Readiness — Xcamp" }] }),
  component: MicroAppsReadinessPage,
});

function MicroAppsReadinessPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <ComingSoonPage
        icon={ClipboardCheck}
        title="Readiness"
        subtitle="This feature is not activated in the demo. Contact admin@xchange.eco."
      />
    </div>
  );
}
