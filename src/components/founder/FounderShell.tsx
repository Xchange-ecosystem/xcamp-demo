// Shell for the P1.1 Founder screens — wraps DemoShell (context providers
// only, no auth gate or real product chrome/sidebar — see
// src/components/demo/DemoShell.tsx), passing it the Founder persona's nav
// tree for DemoNavRail: the original P1.1 four (Home / Companion /
// Navigator / Dashboard) plus a MicroApps group added this session (Pitch
// session scaffold). Only Pitch is a real screen so far — Readiness and
// Evolution are placeholders this session built them for; Logbook (My
// Journal / My Notes), Goals, and Project Builder are shown as items but
// intentionally point at the same placeholder component, carried over to a
// separate future session per that session's scope. These are demo-only,
// mock-data-driven views distinct from the app's real /home, /navigator,
// /journal, /notes, /project/$projectId/goals, /project-builder, etc. — see
// src/routes/demo.founder*.tsx.
import { Outlet } from "@tanstack/react-router";
import {
  BookOpen,
  ClipboardCheck,
  Hammer,
  Home,
  LayoutDashboard,
  LayoutGrid,
  MessageCircle,
  Navigation as NavigationIcon,
  Presentation,
  StickyNote,
  Target,
  TrendingUp,
} from "lucide-react";
import { DemoShell } from "@/components/demo/DemoShell";
import type { DemoNavItem } from "@/components/demo/DemoNavRail";

const founderNavItems: DemoNavItem[] = [
  { to: "/demo/founder", label: "Home", icon: Home, exact: true },
  { to: "/demo/founder/companion", label: "Companion", icon: MessageCircle },
  { to: "/demo/founder/navigator", label: "Navigator", icon: NavigationIcon },
  { to: "/demo/founder/dashboard", label: "Dashboard", icon: LayoutDashboard },
  {
    label: "MicroApps",
    icon: LayoutGrid,
    children: [
      {
        label: "Logbook",
        icon: BookOpen,
        children: [
          { to: "/demo/founder/microapps/journal", label: "My Journal", icon: BookOpen },
          { to: "/demo/founder/microapps/notes", label: "My Notes", icon: StickyNote },
        ],
      },
      { to: "/demo/founder/microapps/goals", label: "Goals", icon: Target },
      { to: "/demo/founder/microapps/pitch", label: "Pitch", icon: Presentation },
      { to: "/demo/founder/microapps/readiness", label: "Readiness", icon: ClipboardCheck },
      { to: "/demo/founder/microapps/evolution", label: "Evolution", icon: TrendingUp },
      { to: "/demo/founder/microapps/project-builder", label: "Project Builder", icon: Hammer },
    ],
  },
];

export function FounderShell() {
  return (
    <DemoShell persona="founder" items={founderNavItems}>
      <Outlet />
    </DemoShell>
  );
}
