// Placeholder — My Notes is carried over to a separate future session per
// the MicroApps scaffold session's scope; this route exists so the nav item
// resolves somewhere. Migrated off ComingSoonPage to the shared
// MicroAppPlaceholder in the B4 session — see that component's header.
import { createFileRoute } from "@tanstack/react-router";
import { MicroAppPlaceholder } from "@/components/demo/MicroAppPlaceholder";

export const Route = createFileRoute("/demo/founder/microapps/notes")({
  head: () => ({ meta: [{ title: "My Notes — Xcamp" }] }),
  component: MicroAppsNotesPage,
});

function MicroAppsNotesPage() {
  return (
    <MicroAppPlaceholder
      title="My Notes"
      what="Holds loose notes that aren't tied to an objective or task yet, and suggests where each one belongs once it firms up."
      who="Founders capturing something before it has structure."
      drawsFrom={["Notes", "Tags", "Objectives"]}
    />
  );
}
