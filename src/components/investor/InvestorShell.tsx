// src/components/investor/InvestorShell.tsx
//
// Sibling of FounderShell.tsx — wraps DemoShell for every /demo/investor/*
// route. Nav items and the switcher's "active project" both derive from the
// current route (pathname + $projectId param) rather than duplicated state,
// so there's exactly one source of truth for "am I looking at an ecosystem
// or a project right now."
import { Outlet, useParams, useRouterState } from "@tanstack/react-router";
import { Briefcase, ClipboardCheck, Home, LayoutDashboard, Map, Presentation } from "lucide-react";
import { DemoShell } from "@/components/demo/DemoShell";
import type { DemoNavItem } from "@/components/demo/DemoNavRail";
import { InvestorEcosystemSwitcher } from "@/components/investor/InvestorEcosystemSwitcher";
import { InvestorEcosystemProvider, useInvestorEcosystem } from "@/contexts/investor-ecosystem";
import { getProjectById } from "@/fixtures";

const ECOSYSTEM_NAV_ITEMS: DemoNavItem[] = [
  { to: "/demo/investor", label: "Portfolio", icon: Briefcase, exact: true },
  { to: "/demo/investor/navigator", label: "Ecosystem Navigator", icon: Map },
];

function projectNavItems(projectId: string): DemoNavItem[] {
  return [
    { to: `/demo/investor/project/${projectId}`, label: "Home", icon: Home, exact: true },
    {
      to: `/demo/investor/project/${projectId}/dashboard`,
      label: "Dashboard",
      icon: LayoutDashboard,
    },
    { to: `/demo/investor/project/${projectId}/pitch`, label: "Pitchdeck", icon: Presentation },
    {
      to: `/demo/investor/project/${projectId}/readiness`,
      label: "Readiness",
      icon: ClipboardCheck,
    },
  ];
}

export function InvestorShell() {
  return (
    <InvestorEcosystemProvider>
      <InvestorShellBody />
    </InvestorEcosystemProvider>
  );
}

function InvestorShellBody() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const params = useParams({ strict: false }) as { projectId?: string };
  const [ecosystemId, setEcosystemId] = useInvestorEcosystem();

  const inProjectMode = pathname.startsWith("/demo/investor/project/") && !!params.projectId;
  const activeProject = params.projectId ? getProjectById(params.projectId) : undefined;

  const items =
    inProjectMode && params.projectId ? projectNavItems(params.projectId) : ECOSYSTEM_NAV_ITEMS;

  return (
    <DemoShell
      persona="investor"
      items={items}
      navExtra={
        <InvestorEcosystemSwitcher
          ecosystemId={ecosystemId}
          onSelectEcosystem={setEcosystemId}
          activeProjectId={inProjectMode ? (params.projectId ?? null) : null}
          activeProjectName={activeProject?.name}
        />
      }
    >
      <Outlet />
    </DemoShell>
  );
}
