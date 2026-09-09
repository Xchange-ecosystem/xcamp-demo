import { createFileRoute } from "@tanstack/react-router";
import { MicroAppPlaceholder } from "@/components/demo/MicroAppPlaceholder";

export const Route = createFileRoute("/demo/collaborator/microapps/knowledge")({
  head: () => ({ meta: [{ title: "Knowledge App — Xcamp" }] }),
  component: KnowledgeAppPage,
});

function KnowledgeAppPage() {
  return (
    <MicroAppPlaceholder
      title="Knowledge App"
      what="Matches your skills and interests to open tasks and discussions across the ecosystem, not just your own projects."
      who="Collaborators looking for their next contribution."
      drawsFrom={["Tasks", "Skill and role tags", "Ecosystem-wide activity"]}
    />
  );
}
