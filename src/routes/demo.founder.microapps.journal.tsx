// Placeholder — My Journal is carried over to a separate future session per
// the MicroApps scaffold session's scope; this route exists so the nav item
// resolves somewhere. Migrated off ComingSoonPage to the shared
// MicroAppPlaceholder in the B4 session — see that component's header.
import { createFileRoute } from "@tanstack/react-router";
import { MicroAppPlaceholder } from "@/components/demo/MicroAppPlaceholder";

export const Route = createFileRoute("/demo/founder/microapps/journal")({
  head: () => ({ meta: [{ title: "My Journal — Xcamp" }] }),
  component: MicroAppsJournalPage,
});

function MicroAppsJournalPage() {
  return (
    <MicroAppPlaceholder
      title="My Journal"
      what="Keeps a dated log of what you did and decided on each project, so the reasoning behind a choice is still there months later."
      who="Founders who need to reconstruct why a project went the way it did."
      drawsFrom={["Journal entries", "Project activity", "Objectives"]}
    />
  );
}
