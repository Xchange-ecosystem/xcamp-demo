import { useEffect } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { BookText, ChevronDown, Compass, LogOut, Map, NotebookPen, PanelLeftClose, PanelLeftOpen, User } from "lucide-react";
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

const items = [
  { title: "home", url: "/home", icon: BookText, labelKey: "nav.journal" },
  { title: "journalApp", url: "/journal", icon: NotebookPen, labelKey: "nav.journalApp" },
  { title: "navigator", url: "/navigator", icon: Map, labelKey: "nav.navigator" },
  { title: "projectBuilder", url: "/project-builder", icon: Compass, labelKey: "nav.projectBuilder" },
];

export function AppSidebar() {
  const { state, toggleSidebar } = useSidebar();
  const collapsed = state === "collapsed";
  const { user, signOut } = useAuth();
  const { t } = useTranslation();
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const { activeProjectId, setActiveProjectId } = useActiveProject();

  const projectsQuery = useQuery({
    queryKey: ["projects", user?.tenantId],
    queryFn: () => listProjects(user!),
    enabled: !!user,
  });
  const projects = projectsQuery.data ?? [];

  useEffect(() => {
    if (projects.length === 0) return;
    const exists = activeProjectId && projects.some((p) => p.id === activeProjectId);
    if (!exists) setActiveProjectId(projects[0].id);
  }, [activeProjectId, projects, setActiveProjectId]);

  const isActive = (url: string) => {
    if (url === "/home") return pathname === "/" || pathname.startsWith("/home");
    return pathname.startsWith(url);
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className={"flex items-center " + (collapsed ? "flex-col gap-1 p-1" : "justify-between px-2 py-3")}>
          <AppLogo collapsed={collapsed} />
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
        {!collapsed && projects.length > 0 && (
          <div className="px-2 pt-4">
            <label
              className="mb-1 block px-1 text-[10px] font-semibold uppercase tracking-wider"
              style={{ color: "var(--skin-ink-faint)" }}
            >
              Project
            </label>
            <div className="relative">
              <select
                className="x-input w-full appearance-none"
                style={{ height: 32, fontSize: 13, paddingRight: 28 }}
                value={activeProjectId ?? ""}
                onChange={(e) => setActiveProjectId(e.target.value || null)}
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <ChevronDown
                className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2"
                style={{ color: "var(--skin-ink-faint)" }}
              />
            </div>
          </div>
        )}

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={t(item.labelKey)}>
                    <Link to={item.url} className="flex items-center gap-2">
                      <item.icon className="h-4 w-4" />
                      <span>{t(item.labelKey)}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="pb-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={isActive("/profile")} tooltip={t("nav.profile")}>
              <Link to="/profile" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span>{t("nav.profile")}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={() => signOut()} tooltip={t("nav.signOut")}>
              <LogOut className="h-4 w-4" />
              <span>{t("nav.signOut")}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
