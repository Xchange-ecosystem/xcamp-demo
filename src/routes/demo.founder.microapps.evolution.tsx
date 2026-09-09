// MicroApps scaffold (Pitch session) — placeholder. Evolution is designed
// (see docs/mockups/pitch-solari-mockup.html's sibling screens) but not
// built this session; this route exists only so the nav item resolves
// somewhere.
import { createFileRoute } from "@tanstack/react-router";
import { TrendingUp } from "lucide-react";
import { ComingSoonPage } from "@/components/ComingSoonPage";

export const Route = createFileRoute("/demo/founder/microapps/evolution")({
  head: () => ({ meta: [{ title: "Evolution — Xcamp" }] }),
  component: MicroAppsEvolutionPage,
});

function MicroAppsEvolutionPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <ComingSoonPage
        icon={TrendingUp}
        title="Evolution"
        subtitle="An AI review of how your Objectives have moved over time — designed, not yet built."
      />
    </div>
  );
}
