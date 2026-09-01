import { createFileRoute, redirect } from "@tanstack/react-router";

// This route predates the Dashboard tab built into /project/$projectId (see
// project.$projectId.tsx) — it used to render a "coming soon" placeholder that
// duplicated (and confusingly outlived) the real, working dashboard. Redirect
// rather than delete so old links/bookmarks still land somewhere useful.
export const Route = createFileRoute("/project/$projectId_/project-dashboard")({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/project/$projectId",
      params: { projectId: params.projectId },
      search: { tab: "dashboard" },
    });
  },
});
