// B4 Stage 3 target — replaced by the Data Room build, which Club Deal
// Finder's Shortlist stage links into. Placeholder only so the nav item
// resolves at the Stage 1 checkpoint.
import { createFileRoute } from "@tanstack/react-router";
import { MicroAppPlaceholder } from "@/components/demo/MicroAppPlaceholder";

export const Route = createFileRoute("/demo/investor/microapps/data-room")({
  head: () => ({ meta: [{ title: "Data Room — Xcamp" }] }),
  component: DataRoomPage,
});

function DataRoomPage() {
  return (
    <MicroAppPlaceholder
      title="Data Room"
      what="Opens the documents and evidence behind a project once you have shortlisted it, in one place rather than across a thread."
      who="Investors who have moved past a first look and need the underlying material."
      drawsFrom={["Proof artifacts", "Objectives", "Evaluations"]}
    />
  );
}
