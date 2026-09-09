// Placeholder — Readiness is designed (see docs/mockups/pitch-solari-mockup.html's
// sibling screens) but not built for the Founder persona; this route exists so
// the nav item resolves somewhere. The Investor-flavoured Readiness is a
// separate build (see /demo/investor/microapps/readiness). Migrated off
// ComingSoonPage to the shared MicroAppPlaceholder in the B4 session.
import { createFileRoute } from "@tanstack/react-router";
import { MicroAppPlaceholder } from "@/components/demo/MicroAppPlaceholder";

export const Route = createFileRoute("/demo/founder/microapps/readiness")({
  head: () => ({ meta: [{ title: "Readiness — Xcamp" }] }),
  component: MicroAppsReadinessPage,
});

function MicroAppsReadinessPage() {
  return (
    <MicroAppPlaceholder
      title="Readiness"
      what="Checks how investor-ready a project is and names what's still missing, rather than giving one score with no route forward."
      who="Founders preparing to raise, who need to know what to fix first."
      drawsFrom={["Objectives", "Proof counts", "Evaluations"]}
    />
  );
}
