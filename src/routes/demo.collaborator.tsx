import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { CollaboratorScreen } from "@/features/collaborator/CollaboratorScreen";

// Namespaced under /demo to match PR #145's route convention for the P1
// demo screens (open at the time this was built) — see
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
    <AppShell>
      <CollaboratorScreen />
    </AppShell>
  );
}
