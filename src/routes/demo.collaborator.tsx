import { createFileRoute } from "@tanstack/react-router";
import { CollaboratorShell } from "@/components/collaborator/CollaboratorShell";

export const Route = createFileRoute("/demo/collaborator")({
  head: () => ({
    meta: [{ title: "Collaborator — Xcamp" }],
  }),
  component: CollaboratorShell,
});
