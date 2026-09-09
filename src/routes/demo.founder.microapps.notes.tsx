// MicroApps scaffold (Pitch session) — placeholder. My Notes is carried
// over to a separate future session per that session's scope; this route
// exists only so the nav item resolves somewhere.
import { createFileRoute } from "@tanstack/react-router";
import { StickyNote } from "lucide-react";
import { ComingSoonPage } from "@/components/ComingSoonPage";

export const Route = createFileRoute("/demo/founder/microapps/notes")({
  head: () => ({ meta: [{ title: "My Notes — Xcamp" }] }),
  component: MicroAppsNotesPage,
});

function MicroAppsNotesPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <ComingSoonPage
        icon={StickyNote}
        title="My Notes"
        subtitle="Search, tag, and organize project notes — coming soon."
      />
    </div>
  );
}
