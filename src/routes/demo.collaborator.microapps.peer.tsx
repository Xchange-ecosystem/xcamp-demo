// Peer — presentational carry-over of the main app's Ecosystem Navigator.
// See src/features/peer/PeerDirectoryScreen.tsx for exactly what was stripped
// (AppShell, useAuth, listTenantMembers) and what was kept verbatim.
import { createFileRoute } from "@tanstack/react-router";
import { PeerDirectoryScreen } from "@/features/peer/PeerDirectoryScreen";

export const Route = createFileRoute("/demo/collaborator/microapps/peer")({
  head: () => ({
    meta: [
      { title: "Peer — Xcamp" },
      { name: "description", content: "Browse everyone in the Xcamp ecosystem." },
    ],
  }),
  component: PeerPage,
});

function PeerPage() {
  return <PeerDirectoryScreen />;
}
