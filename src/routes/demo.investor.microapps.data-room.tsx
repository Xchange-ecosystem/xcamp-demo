import { createFileRoute } from "@tanstack/react-router";
import { DataRoomScreen } from "@/features/data-room/DataRoomScreen";

// ?project=<id> deep-links from a shortlisted Club Deal Finder card. Validated
// rather than trusted: an unknown or locked id just falls back to the first
// unlocked room (see DataRoomScreen), so a stale link never lands on an error.
export const Route = createFileRoute("/demo/investor/microapps/data-room")({
  validateSearch: (search: Record<string, unknown>): { project?: string } => ({
    ...(typeof search.project === "string" ? { project: search.project } : {}),
  }),
  head: () => ({
    meta: [
      { title: "Data Room — Xcamp" },
      {
        name: "description",
        content: "Evidence filed against each objective, for projects you have shortlisted.",
      },
    ],
  }),
  component: DataRoomPage,
});

function DataRoomPage() {
  const { project } = Route.useSearch();
  return <DataRoomScreen initialProjectId={project} />;
}
