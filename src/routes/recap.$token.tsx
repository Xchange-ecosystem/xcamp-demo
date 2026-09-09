// /recap/:token — public, no login.
//
// Rendered outside AppShell, the same structural position every /demo/* route
// takes, but for the opposite reason: this page is public by design. __root
// only provides the query client, providers and the toaster — AuthProvider
// never redirects — so an unauthenticated visitor renders fine.
import { createFileRoute } from "@tanstack/react-router";
import { PublicRecapPage } from "@/features/recap/PublicRecapPage";

export const Route = createFileRoute("/recap/$token")({
  head: () => ({
    meta: [
      { title: "Your follow-ups" },
      { name: "description", content: "Follow-ups from your call." },
      // Every one of these URLs is a per-person credential; none should be
      // crawled or indexed.
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: PublicRecapRoute,
});

function PublicRecapRoute() {
  const { token } = Route.useParams();
  return <PublicRecapPage token={token} />;
}
