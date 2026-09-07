import { createFileRoute } from "@tanstack/react-router";
import { DemoShell } from "@/components/demo/DemoShell";
import { CollaboratorScreen } from "@/features/collaborator/CollaboratorScreen";

// Namespaced under /demo to match the other P1 presentation screens — see
// CollaboratorScreen.tsx for the Phase 0 notes this route depends on.
export const Route = createFileRoute("/demo/collaborator")({
  head: () => ({
    meta: [
      { title: "My assignments — Xcamp" },
      {
        name: "description",
        content: "Assignment feed, personal metrics, and value wallet for collaborators.",
      },
    ],
  }),
  component: CollaboratorPage,
});

function CollaboratorPage() {
  return (
    <DemoShell>
      <CollaboratorScreen />
    </DemoShell>
  );
}
