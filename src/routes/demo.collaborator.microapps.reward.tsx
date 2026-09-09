// Reward Collaboration — the existing ValueWallet, rendered verbatim as its
// own screen. B4 Phase 0 confirmed these are the same surface, not two tools:
// the wallet was already the (read-only, partial) reward view, reachable only
// as an aside inside Assignments. This route gives it the nav slot the
// roadmap names, without redesigning it or inventing an allocation flow that
// exists nowhere in the product today.
import { createFileRoute } from "@tanstack/react-router";
import { ValueWallet } from "@/features/collaborator/ValueWallet";
import { DEMO_COLLABORATOR_ID, getAssignmentsByAssignee } from "@/fixtures/assignments";
import { getPersonById } from "@/fixtures/people";

export const Route = createFileRoute("/demo/collaborator/microapps/reward")({
  head: () => ({
    meta: [
      { title: "Reward Collaboration — Xcamp" },
      {
        name: "description",
        content: "Settled, committed, and informational value across your collaborations.",
      },
    ],
  }),
  component: RewardCollaborationPage,
});

function RewardCollaborationPage() {
  const assignments = getAssignmentsByAssignee(DEMO_COLLABORATOR_ID);
  const collaborator = getPersonById(DEMO_COLLABORATOR_ID);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
      <h1 className="mb-1.5 text-xl font-semibold tracking-tight text-foreground">
        Reward Collaboration
      </h1>
      <p className="mb-6 text-sm text-muted-foreground">
        What {collaborator?.displayName ?? "you"} has earned, what is locked under agreement, and
        what is still only proposed.
      </p>

      <div style={{ maxWidth: 380 }}>
        <ValueWallet assignments={assignments} collaboratorId={DEMO_COLLABORATOR_ID} />
      </div>
    </div>
  );
}
