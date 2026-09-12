// Shell for the P1.1 Founder screens — wraps DemoShell (context providers
// only, no auth gate or real product chrome/sidebar — see
// src/components/demo/DemoShell.tsx), passing it the Founder persona's nav
// tree for DemoNavRail: Home / Navigator (now a parent with four sub-views —
// Board/List/Network/Timeline, mirroring the Logbook group's nesting below;
// see src/components/demo/navigator/) / Dashboard (Companion was a fourth
// top-level item here but is now an altitude, not a Navrail destination, see
// the comment below) plus a MicroApps group. Goals/Pitch/Readiness are real
// screens; Logbook (My Journal / My Notes), Evolution, and Project Builder
// are still placeholders. These are demo-only, mock-data-driven views
// distinct from the app's real /home, /navigator, /journal, /notes,
// /project/$projectId/goals, /project-builder, etc. — see
// src/routes/demo.founder*.tsx.
import { Outlet } from "@tanstack/react-router";
import {
  BookOpen,
  ClipboardCheck,
  GanttChartSquare,
  Hammer,
  Home,
  Kanban,
  LayoutDashboard,
  LayoutGrid,
  List,
  Navigation as NavigationIcon,
  Presentation,
  Share2,
  StickyNote,
  Target,
  TrendingUp,
} from "lucide-react";
import { DemoShell } from "@/components/demo/DemoShell";
import type { DemoNavItem } from "@/components/demo/DemoNavRail";

// "Companion" is deliberately not a Navrail item — it's an altitude (the
// AltitudeRail, always mounted by DemoShell), not a platform-level
// destination with its own URL. It used to also exist as a standalone
// /demo/founder/companion route+nav-item; that duplicated the real
// Companion-altitude experience (CompanionAltitudeShell) under a
// same-named but much simpler page, so it was removed rather than kept as
// a second "Companion" surface. See PersonaStartScreen's
// "Companion-first Guidance" tile for how you now get there instead.
const founderNavItems: DemoNavItem[] = [
  { to: "/demo/founder", label: "Home", icon: Home, exact: true },
  {
    label: "Navigator",
    icon: NavigationIcon,
    children: [
      { to: "/demo/founder/navigator/board", label: "Board", icon: Kanban },
      { to: "/demo/founder/navigator/list", label: "List", icon: List },
      { to: "/demo/founder/navigator/network", label: "Network", icon: Share2 },
      { to: "/demo/founder/navigator/timeline", label: "Timeline", icon: GanttChartSquare },
    ],
  },
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
