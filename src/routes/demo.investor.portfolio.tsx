// Legacy path kept alive on purpose: the main app's sidebar
// (src/components/AppSidebarExperimental.tsx) hard-links /demo/investor/portfolio
// for the investor persona. B4 moved the screen under MicroApps; this redirect
// keeps that link working rather than shipping a second copy of the screen.
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/demo/investor/portfolio")({
  beforeLoad: () => {
    throw redirect({ to: "/demo/investor/microapps/portfolio" });
  },
});
