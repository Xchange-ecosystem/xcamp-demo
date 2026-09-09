// B4 Stage 2 target — replaced by the real trust-card + due-diligence Stage
// build. Placeholder only so the nav item resolves at the Stage 1 checkpoint.
import { createFileRoute } from "@tanstack/react-router";
import { MicroAppPlaceholder } from "@/components/demo/MicroAppPlaceholder";

export const Route = createFileRoute("/demo/investor/microapps/due-diligence")({
  head: () => ({ meta: [{ title: "Due Diligence — Xcamp" }] }),
  component: DueDiligencePage,
});

function DueDiligencePage() {
  return (
    <MicroAppPlaceholder
      title="Due Diligence"
      what="Reads a project's record as provenance — how much proof was filed, who assessed it, who contributed what, and whether quality held up over time."
      who="Investors deciding whether a project's claims are backed by evidence."
      drawsFrom={["Objectives", "Proof counts", "Evaluations", "Settled value"]}
    />
  );
}
