// Placeholder — Goals is carried over to a separate future session per the
// MicroApps scaffold session's scope; this route exists so the nav item
// resolves somewhere. Migrated off ComingSoonPage to the shared
// MicroAppPlaceholder in the B4 session — see that component's header.
import { createFileRoute } from "@tanstack/react-router";
import { MicroAppPlaceholder } from "@/components/demo/MicroAppPlaceholder";

export const Route = createFileRoute("/demo/founder/microapps/goals")({
  head: () => ({ meta: [{ title: "Goals — Xcamp" }] }),
  component: MicroAppsGoalsPage,
});

function MicroAppsGoalsPage() {
  return (
    <MicroAppPlaceholder
      title="Goals"
      what="Turns a rough intention into a structured Objective — the dimension it moves, and what would count as proof it happened."
      who="Founders shaping new work before anyone starts on it."
      drawsFrom={["Objectives", "Dimensions", "Proof requirements"]}
    />
  );
}
