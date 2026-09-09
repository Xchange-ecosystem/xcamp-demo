// Shell for the Investor demo screens — mirrors FounderShell exactly (see
// src/components/founder/FounderShell.tsx): wraps DemoShell, which supplies
// context providers only, no auth gate and no real product chrome. Built in
// the B4 session; before it, the Investor persona had no shell at all and its
// single nav item was duplicated inline across two route files.
//
// Companion is deliberately absent. The main app gives the investor persona a
// Companion item, but points it at /home, which is not investor-specific —
// there is no investor Companion experience to link to yet, and inventing one
// was out of scope for B4. It gets added when there is something real behind
// it, not as a nav item leading nowhere.
//
// Portfolio sits under MicroApps at /demo/investor/microapps/portfolio. The
// older /demo/investor/portfolio path still resolves — the main app's sidebar
// (AppSidebarExperimental) hard-links it for the investor persona — and now
// redirects here, so that link keeps working without a second copy of the
// screen.
import { Outlet } from "@tanstack/react-router";
import {
  ArrowLeftRight,
  Briefcase,
  ClipboardCheck,
  Columns3,
  FileSearch,
  Flame,
  FolderLock,
  Home,
  LayoutDashboard,
  LayoutGrid,
  Navigation as NavigationIcon,
  Share2,
} from "lucide-react";
import { DemoShell } from "@/components/demo/DemoShell";
import type { DemoNavItem } from "@/components/demo/DemoNavRail";

const investorNavItems: DemoNavItem[] = [
  { to: "/demo/investor", label: "Home", icon: Home, exact: true },
  { to: "/demo/investor/navigator", label: "Navigator", icon: NavigationIcon },
  { to: "/demo/investor/dashboard", label: "Dashboard", icon: LayoutDashboard },
  {
    label: "MicroApps",
    icon: LayoutGrid,
    children: [
      { to: "/demo/investor/microapps/portfolio", label: "Portfolio", icon: Briefcase },
      {
        to: "/demo/investor/microapps/club-deal-finder",
        label: "Club Deal Finder",
        icon: Columns3,
      },
      { to: "/demo/investor/microapps/due-diligence", label: "Due Diligence", icon: FileSearch },
      { to: "/demo/investor/microapps/readiness", label: "Readiness", icon: ClipboardCheck },
      { to: "/demo/investor/microapps/data-room", label: "Data Room", icon: FolderLock },
      { to: "/demo/investor/microapps/deal-flow", label: "Deal-Flow & -Share", icon: Share2 },
      { to: "/demo/investor/microapps/hot-stuff", label: "Hot Stuff", icon: Flame },
      {
        to: "/demo/investor/microapps/secondary-market",
        label: "Secondary Market",
        icon: ArrowLeftRight,
      },
    ],
  },
];

export function InvestorShell() {
  return (
    <DemoShell persona="investor" items={investorNavItems}>
      <Outlet />
    </DemoShell>
  );
}
