import { createFileRoute, Outlet } from "@tanstack/react-router";
import { FolderX } from "lucide-react";
import { ComingSoonPage } from "@/components/ComingSoonPage";
import { getProjectById } from "@/fixtures";

// Layout for every /demo/investor/project/$projectId/* route — the shared
// "does this id resolve to a real fixture project" guard, so Home/Dashboard/
// Pitchdeck don't each need their own not-found handling.
export const Route = createFileRoute("/demo/investor/project/$projectId")({
  head: () => ({ meta: [{ title: "Project — Xcamp" }] }),
  component: InvestorProjectLayout,
});

function InvestorProjectLayout() {
  const { projectId } = Route.useParams();
  const project = getProjectById(projectId);

  if (!project) {
    return (
      <ComingSoonPage
        icon={FolderX}
        title="Project not found"
        subtitle="This project id doesn't match anything in the demo portfolio."
      />
    );
  }

  return <Outlet />;
}
