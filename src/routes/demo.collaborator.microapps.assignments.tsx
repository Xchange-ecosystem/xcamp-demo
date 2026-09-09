// Assignments — the existing P1.3 Collaborator screen, unchanged. B4 only
// moved it under the MicroApps nav group; see CollaboratorScreen.tsx for the
// Phase 0 notes it depends on.
import { createFileRoute } from "@tanstack/react-router";
import { CollaboratorScreen } from "@/features/collaborator/CollaboratorScreen";

export const Route = createFileRoute("/demo/collaborator/microapps/assignments")({
  head: () => ({
    meta: [
      { title: "My assignments — Xcamp" },
      {
        name: "description",
        content: "Assignment feed, personal metrics, and value wallet for collaborators.",
      },
    ],
  }),
  component: CollaboratorAssignmentsPage,
});

function CollaboratorAssignmentsPage() {
  return <CollaboratorScreen />;
}
