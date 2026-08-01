/**
 * AppSidebarExperimental — sibling of AppSidebar.tsx
 *
 * Activate with ?nav=experimental on any route that renders AppShell or CompanionShell.
 * Original AppSidebar.tsx is untouched.
 *
 * Phase 1 experiment:
 *  - Two-segment Ecosystem / Project selector replaces the plain <select> dropdown
 *  - Click behaviour per spec: Ecosystem always switches mode; project segment opens
 *    the switcher (when in Project mode) or switches directly (when a project is remembered)
 *  - Mode-specific nav lists: Ecosystem has 4 items, Project has 5 items
 */

import { useRef, useState } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Check,
  ChevronDown,
  Compass,
  Home,
  LogOut,
  Map,
  MessageCircle,
  NotebookPen,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Settings2,
  Target,
  User,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/auth";
import { useActiveProject } from "@/contexts/active-project";
import { listProjects } from "@/lib/xcamp-api";
import { AppLogo } from "@/components/AppLogo";

// ─── Nav lists per mode ───────────────────────────────────────────────────────

type NavItem = {
  title: string;
  url: string;
  icon: React.ElementType;
  label: string;
  parameterised?: boolean;
};

const ECOSYSTEM_NAV: NavItem[] = [
  { title: "home",      url: "/home",            icon: Home,          label: "Home" },
  { title: "companion", url: "/home",            icon: MessageCircle, label: "Companion" },
  { title: "navigator", url: "/navigator",       icon: Map,           label: "Ecosystem Navigator" },
  { title: "builder",   url: "/project-builder", icon: Compass,       label: "Project Builder" },
];

const PROJECT_NAV: NavItem[] = [
  { title: "home",            url: "/home",            icon: Home,          label: "Home" },
  { title: "companion",       url: "/home",            icon: MessageCircle, label: "Companion" },
  { title: "journal",         url: "/journal",         icon: NotebookPen,   label: "Journal" },
  { title: "navigator",       url: "/navigator",       icon: Map,           label: "Project Navigator" },
  { title: "goals",           url: "",                 icon: Target,        label: "My Goals", parameterised: true },
  { title: "project-details", url: "/project-details", icon: Settings2,     label: "Project Details" },
];

export function AppSidebarExperimental() {
  const { state, toggleSidebar } = useSidebar();
  const collapsed = state === "collapsed";
  const { user, signOut } = useAuth();
  const { t } = useTranslation();
  const location = useRouterState({ select: (r) => r.location });
  const pathname = location.pathname;
  const navigate = useNavigate();

  const { activeProjectId, setActiveProjectId, navMode, setNavMode } = useActiveProject();

  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [switcherQuery, setSwitcherQuery] = useState("");
  const switcherRef = useRef<HTMLDivElement>(null);

  const handleSignOut = async () => {
    setActiveProjectId(null);
    await signOut();
  };

  const projectsQuery = useQuery({
    queryKey: ["projects", user?.tenantId],
    queryFn: () => listProjects(user!),
    enabled: !!user,
  });
  const projects = projectsQuery.data ?? [];

  const activeProject = projects.find((p) => p.id === activeProjectId) ?? null;

  const filteredProjects = switcherQuery
    ? projects.filter((p) => p.name.toLowerCase().includes(switcherQuery.toLowerCase()))
    : projects;

  // ── Segmented control handlers ────────────────────────────────────────────

  function handleEcosystemClick() {
    setNavMode("ecosystem");
    setSwitcherOpen(false);
  }

  function handleProjectSegmentClick() {
    if (navMode === "project") {
      setSwitcherOpen((o) => !o);
      setSwitcherQuery("");
    } else if (activeProjectId) {
      setNavMode("project");
      setSwitcherOpen(false);
    } else {
      setSwitcherOpen(true);
      setSwitcherQuery("");
    }
  }

  function handleSelectProject(id: string) {
    setActiveProjectId(id);
    setNavMode("project");
    setSwitcherOpen(false);
    setSwitcherQuery("");
  }

  // ── Nav helpers ───────────────────────────────────────────────────────────

  const navItems = navMode === "project" ? PROJECT_NAV : ECOSYSTEM_NAV;

  function resolveUrl(item: NavItem): string {
    if (item.parameterised && activeProjectId) return `/project/${activeProjectId}`;
    if (item.parameterised) return "/home";
    return item.url;
  }

  const isActive = (url: string) => {
    if (url === "/home" || url === "") return pathname === "/" || pathname.startsWith("/home");
    return pathname.startsWith(url);
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div
          className={"flex items-center " + (collapsed ? "flex-col gap-1 p-1" : "justify-between px-2 py-3")}
          style={{ borderBottom: "2px solid var(--skin-accent, #4de0c1)", marginBottom: collapsed ? 0 : 2 }}
        >
          <AppLogo collapsed={collapsed} />
          {!collapsed && (
            <span
              style={{
                fontSize: 9,
                fontWeight: 600,
                color: "var(--skin-accent, #4de0c1)",
                background: "rgba(77,224,193,0.1)",
                border: "1px solid rgba(77,224,193,0.25)",
                borderRadius: 3,
                padding: "1px 5px",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                flexShrink: 0,
              }}
            >
              exp
            </span>
          )}
          <button
            onClick={toggleSidebar}
            className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors cursor-pointer"
            aria-label="Toggle sidebar"
          >
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* ── Segmented Ecosystem / Project control ────────────────────── */}
        {!collapsed && (
          <div className="px-3 pt-3 pb-1 relative" ref={switcherRef}>
            <div
              style={{
                display: "flex",
                borderRadius: 8,
                border: "1px solid var(--skin-line)",
                overflow: "hidden",
                fontSize: 12,
                fontWeight: 500,
              }}
            >
              {/* Ecosystem segment */}
              <button
                onClick={handleEcosystemClick}
                style={{
                  flexShrink: 0,
                  padding: "6px 10px",
                  background: navMode === "ecosystem" ? "var(--skin-accent, #4de0c1)" : "transparent",
                  color: navMode === "ecosystem" ? "var(--skin-bg, #0a0a0a)" : "var(--skin-ink-soft)",
                  border: "none",
                  cursor: "pointer",
                  transition: "background 0.15s, color 0.15s",
                  whiteSpace: "nowrap",
                }}
              >
                Ecosystem
              </button>

              {/* Divider */}
              <div style={{ width: 1, background: "var(--skin-line)", flexShrink: 0 }} />

              {/* Project segment */}
              <button
                onClick={handleProjectSegmentClick}
                style={{
                  flex: 1,
                  minWidth: 0,
                  padding: "6px 8px 6px 10px",
                  background: navMode === "project" ? "var(--skin-accent, #4de0c1)" : "transparent",
                  color: navMode === "project" ? "var(--skin-bg, #0a0a0a)" : "var(--skin-ink-soft)",
                  border: "none",
                  cursor: "pointer",
                  transition: "background 0.15s, color 0.15s",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
                title={activeProject?.name ?? "Select project"}
              >
                <span
                  style={{
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    flex: 1,
                    textAlign: "left",
                    fontSize: 12,
                  }}
                >
                  {activeProject ? activeProject.name : "Select project"}
                </span>
                <ChevronDown className="h-3 w-3 shrink-0" style={{ opacity: 0.6 }} />
              </button>
            </div>

            {/* Project switcher dropdown */}
            {switcherOpen && (
              <div
                style={{
                  position: "absolute",
                  left: 12,
                  right: 12,
                  top: "calc(100% - 2px)",
                  background: "var(--skin-surface)",
                  border: "1px solid var(--skin-line)",
                  borderRadius: 8,
                  boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
                  zIndex: 50,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "8px 10px",
                    borderBottom: "1px solid var(--skin-line)",
                  }}
                >
                  <Search className="h-3.5 w-3.5" style={{ color: "var(--skin-ink-faint)", flexShrink: 0 }} />
                  <input
                    autoFocus
                    placeholder="Search projects…"
                    value={switcherQuery}
                    onChange={(e) => setSwitcherQuery(e.target.value)}
                    style={{
                      flex: 1,
                      border: "none",
                      outline: "none",
                      background: "transparent",
                      fontSize: 12,
                      color: "var(--skin-ink)",
                    }}
                  />
                </div>
                <div style={{ maxHeight: 180, overflowY: "auto" }}>
                  {filteredProjects.length === 0 ? (
                    <div style={{ padding: "10px 12px", fontSize: 12, color: "var(--skin-ink-faint)" }}>
                      No projects found
                    </div>
                  ) : (
                    filteredProjects.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => handleSelectProject(p.id)}
                        className="hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          width: "100%",
                          padding: "8px 12px",
                          border: "none",
                          background: "transparent",
                          cursor: "pointer",
                          fontSize: 12,
                          color: "var(--skin-ink)",
                          textAlign: "left",
                        }}
                      >
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {p.name}
                        </span>
                        {p.id === activeProjectId && (
                          <Check className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--skin-accent, #4de0c1)" }} />
                        )}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Collapsed: dot indicator when in project mode */}
        {collapsed && navMode === "project" && (
          <div style={{ display: "flex", justifyContent: "center", padding: "4px 0" }}>
            <div
              title={activeProject?.name ?? "Project mode"}
              style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--skin-accent, #4de0c1)" }}
            />
          </div>
        )}

        {/* ── Mode-specific nav items ───────────────────────────────────── */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const url = resolveUrl(item);
                const active = isActive(item.parameterised ? url : item.url);

                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild={false}
                      isActive={active}
                      tooltip={item.label}
                      onClick={() => void navigate({ to: url as never, search: (prev: Record<string, unknown>) => ({ ...prev }) })}
                      className="flex items-center gap-2 w-full"
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="pb-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={pathname.startsWith("/profile")} tooltip={t("nav.profile")}>
              <Link to="/profile" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span>{t("nav.profile")}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={() => void handleSignOut()} tooltip={t("nav.signOut")}>
              <LogOut className="h-4 w-4" />
              <span>{t("nav.signOut")}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      {/* Click-outside overlay to close switcher */}
      {switcherOpen && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 49 }}
          onClick={() => setSwitcherOpen(false)}
          aria-hidden
        />
      )}
    </Sidebar>
  );
}
