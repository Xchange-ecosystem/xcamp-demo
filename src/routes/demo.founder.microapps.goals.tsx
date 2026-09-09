// MicroApps scaffold (Pitch session) — placeholder. Goals is carried over
// to a separate future session per that session's scope; this route
// exists only so the nav item resolves somewhere.
import { createFileRoute } from "@tanstack/react-router";
import { Target } from "lucide-react";
import { ComingSoonPage } from "@/components/ComingSoonPage";

export const Route = createFileRoute("/demo/founder/microapps/goals")({
  head: () => ({ meta: [{ title: "Goals — Xcamp" }] }),
  component: MicroAppsGoalsPage,
});

function MicroAppsGoalsPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <ComingSoonPage
        icon={Target}
        title="Goals"
        subtitle="Build and refine Objectives with AI assistance — coming soon."
      />
    </div>
  );
}
