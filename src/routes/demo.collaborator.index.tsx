// The Collaborator persona has no Home screen — it is entirely MicroApps —
// so its root lands on Assignments rather than standing up an empty landing
// page. DemoNavRail's persona switcher links here.
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/demo/collaborator/")({
  beforeLoad: () => {
    throw redirect({ to: "/demo/collaborator/microapps/assignments" });
  },
});
