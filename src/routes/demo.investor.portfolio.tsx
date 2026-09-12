import { createFileRoute, redirect } from "@tanstack/react-router";

// Kept only because the real (non-demo) app's investor sidebar
// (AppSidebarExperimental.tsx's ECOSYSTEM_NAV "investor-portfolio" entry)
// links here directly. The content itself moved to the ecosystem-level
// landing page at /demo/investor (see demo.investor.index.tsx) once that
// route stopped being a bare duplicate of this one — this route now just
// redirects rather than maintaining two copies of the same screen.
export const Route = createFileRoute("/demo/investor/portfolio")({
  beforeLoad: () => {
    throw redirect({ to: "/demo/investor" });
  },
});
