// Shell for the Collaborator demo screens — mirrors FounderShell exactly (see
// src/components/founder/FounderShell.tsx): wraps DemoShell, which supplies
// context providers only, no auth gate and no real product chrome. Built in
// the B4 session; before it, the Collaborator persona had no shell at all and
// its single nav item was declared inline in demo.collaborator.tsx.
//
// No Home item: the Collaborator persona is entirely MicroApps today, so
// /demo/collaborator redirects to Assignments rather than standing up a
// landing screen with nothing on it. The persona switcher in DemoNavRail
// links to /demo/collaborator and lands there via that redirect.
//
// "Reward Collaboration" is the existing ValueWallet, not a new tool — the B4
// Phase 0 audit confirmed they are the same surface (a read-only wallet
// distinguishing settled / committed / informational value), previously
// reachable only as an aside inside the Assignments screen. Its route renders
// that component verbatim.
import { Outlet } from "@tanstack/react-router";
import { BookOpen, ClipboardList, LayoutGrid, Users, Wallet } from "lucide-react";
import { DemoShell } from "@/components/demo/DemoShell";
import type { DemoNavItem } from "@/components/demo/DemoNavRail";

const collaboratorNavItems: DemoNavItem[] = [
  {
    label: "MicroApps",
    icon: LayoutGrid,
    children: [
      {
        to: "/demo/collaborator/microapps/assignments",
        label: "Assignments",
        icon: ClipboardList,
      },
      {
        to: "/demo/collaborator/microapps/reward",
        label: "Reward Collaboration",
        icon: Wallet,
      },
      { to: "/demo/collaborator/microapps/peer", label: "Peer", icon: Users },
      { to: "/demo/collaborator/microapps/knowledge", label: "Knowledge App", icon: BookOpen },
    ],
  },
];

export function CollaboratorShell() {
  return (
    <DemoShell persona="collaborator" items={collaboratorNavItems}>
      <Outlet />
    </DemoShell>
  );
}
