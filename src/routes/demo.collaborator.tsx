import { createFileRoute } from "@tanstack/react-router";
import { ClipboardList } from "lucide-react";
import { DemoShell } from "@/components/demo/DemoShell";
import type { DemoNavItem } from "@/components/demo/DemoNavRail";
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

// Collaborator only has one screen today — Navrail gets a single item
// pointing at their persona home. More screens (and a real multi-item
// Navrail) are deferred to a later session per Fabian's instruction.
const collaboratorNavItems: DemoNavItem[] = [
  { to: "/demo/collaborator", label: "Assignments", icon: ClipboardList, exact: true },
];

function CollaboratorPage() {
  return (
    <DemoShell persona="collaborator" items={collaboratorNavItems}>
      <CollaboratorScreen />
    </DemoShell>
  );
}
