// MicroApps scaffold (Pitch session) — placeholder. My Journal is carried
// over to a separate future session per that session's scope; this route
// exists only so the nav item resolves somewhere.
import { createFileRoute } from "@tanstack/react-router";
import { BookOpen } from "lucide-react";
import { ComingSoonPage } from "@/components/ComingSoonPage";

export const Route = createFileRoute("/demo/founder/microapps/journal")({
  head: () => ({ meta: [{ title: "My Journal — Xcamp" }] }),
  component: MicroAppsJournalPage,
});

function MicroAppsJournalPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <ComingSoonPage
        icon={BookOpen}
        title="My Journal"
        subtitle="This feature is not activated in the demo. Contact admin@xchange.eco."
      />
    </div>
  );
}
