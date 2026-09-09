// /admin/recap — internal tool, not part of the demo.
//
// Wrapped in AppShell, which is this app's only auth gate: it redirects to
// /auth when there's no signed-in user. That's deliberately the normal product
// login rather than a role check — `user_roles`/`has_role` exist in the
// database but nothing in this app calls them yet, so a role gate would be net
// new plumbing. The route is unlisted: AppSidebar's nav items are a hardcoded
// array and this route is not in it, so Recap is reachable only by URL.
import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { RecapComposer } from "@/features/recap/RecapComposer";

export const Route = createFileRoute("/admin/recap")({
  head: () => ({
    meta: [
      { title: "Recap — Xcamp" },
      { name: "description", content: "Turn a real call transcript into follow-up pages." },
      // Internal tool; keep it out of search results.
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminRecapPage,
});

function AdminRecapPage() {
  return (
    <AppShell>
      <RecapComposer />
    </AppShell>
  );
}
