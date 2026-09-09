// Placeholder — Evolution is designed (see docs/mockups/pitch-solari-mockup.html's
// sibling screens) but not built; this route exists so the nav item resolves
// somewhere. Migrated off ComingSoonPage to the shared MicroAppPlaceholder in
// the B4 session — see that component's header.
import { createFileRoute } from "@tanstack/react-router";
import { MicroAppPlaceholder } from "@/components/demo/MicroAppPlaceholder";

export const Route = createFileRoute("/demo/founder/microapps/evolution")({
  head: () => ({ meta: [{ title: "Evolution — Xcamp" }] }),
  component: MicroAppsEvolutionPage,
});

function MicroAppsEvolutionPage() {
  return (
    <MicroAppPlaceholder
      title="Evolution"
      what="Shows how a project's Objectives have moved over time — what was added, dropped, or reworded, and when."
      who="Founders checking whether the plan still matches what the project actually became."
      drawsFrom={["Objective history", "Completion dates", "Quality trend"]}
    />
  );
}
