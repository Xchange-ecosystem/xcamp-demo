// Placeholder — Project Builder is carried over to a separate future session
// per the MicroApps scaffold session's scope; this route exists so the nav
// item resolves somewhere. Migrated off ComingSoonPage to the shared
// MicroAppPlaceholder in the B4 session — see that component's header.
import { createFileRoute } from "@tanstack/react-router";
import { MicroAppPlaceholder } from "@/components/demo/MicroAppPlaceholder";

export const Route = createFileRoute("/demo/founder/microapps/project-builder")({
  head: () => ({ meta: [{ title: "Project Builder — Xcamp" }] }),
  component: MicroAppsProjectBuilderPage,
});

function MicroAppsProjectBuilderPage() {
  return (
    <MicroAppPlaceholder
      title="Project Builder"
      what="Sets up a new project's structure — its objectives, the dimensions they move, and who is on it."
      who="Founders starting something new who don't want to build the scaffolding by hand."
      drawsFrom={["Projects", "Dimensions", "People and roles"]}
    />
  );
}
