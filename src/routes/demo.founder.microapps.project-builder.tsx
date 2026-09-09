// MicroApps scaffold (Pitch session) — placeholder. Project Builder is
// carried over to a separate future session per that session's scope; this
// route exists only so the nav item resolves somewhere. Distinct from the
// real, live /project-builder (Backcaster) route in the main app.
import { createFileRoute } from "@tanstack/react-router";
import { Hammer } from "lucide-react";
import { ComingSoonPage } from "@/components/ComingSoonPage";

export const Route = createFileRoute("/demo/founder/microapps/project-builder")({
  head: () => ({ meta: [{ title: "Project Builder — Xcamp" }] }),
  component: MicroAppsProjectBuilderPage,
});

function MicroAppsProjectBuilderPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <ComingSoonPage
        icon={Hammer}
        title="Project Builder"
        subtitle="Generate a project plan from a one-line pitch — coming soon."
      />
    </div>
  );
}
