// Shell for the P1.1 Founder screens — wraps DemoShell (context providers
// only, no auth gate or real product chrome/sidebar — see
// src/components/demo/DemoShell.tsx), passing it the Founder persona's four
// nav destinations from the P1.1 mockup (Home / Companion / Navigator /
// Dashboard) for DemoNavRail. These are demo-only, mock-data-driven views
// distinct from the app's real /home, /navigator, etc. — see
// src/routes/demo.founder*.tsx.
import { Outlet } from "@tanstack/react-router";
import { LayoutDashboard, MessageCircle, Navigation as NavigationIcon, Home } from "lucide-react";
import { DemoShell } from "@/components/demo/DemoShell";
import type { DemoNavItem } from "@/components/demo/DemoNavRail";

const founderNavItems: DemoNavItem[] = [
  { to: "/demo/founder", label: "Home", icon: Home, exact: true },
  { to: "/demo/founder/companion", label: "Companion", icon: MessageCircle },
  { to: "/demo/founder/navigator", label: "Navigator", icon: NavigationIcon },
  { to: "/demo/founder/dashboard", label: "Dashboard", icon: LayoutDashboard },
];

export function FounderShell() {
  return (
    <DemoShell persona="founder" items={founderNavItems}>
      <Outlet />
    </DemoShell>
  );
}
