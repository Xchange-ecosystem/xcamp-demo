import { useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  ChevronDown,
  ChevronRight,
  Compass,
  FilePlus,
  Home,
  LayoutGrid,
  LayoutList,
  LogOut,
  Map,
  NotebookPen,
  NotebookText,
  PanelLeftClose,
  PanelLeftOpen,
  Share2,
  Sparkles,
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
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/auth";
import { useActiveProject } from "@/contexts/active-project";
import { listProjects } from "@/lib/xcamp-api";
import { AppLogo } from "@/components/AppLogo";

const flatItems = [
  { title: "home",           url: "/home",           icon: Home,        labelKey: "nav.home" },
  { title: "portfolio",      url: "/portfolio",      icon: LayoutGrid,  labelKey: "nav.portfolio" },
  { title: "projectBuilder", url: "/project-builder",icon: Compass,     labelKey: "nav.projectBuilder" },
];

export function AppSidebar() {
  const { state, toggleSidebar, isMobile } = useSidebar();
  const collapsed = state === "collapsed";
  const { user, signOut } = useAuth();
  const { t } = useTranslation();
  const location = useRouterState({ select: (r) => r.location });
  const pathname = location.pathname;
  const searchView = (location.search as Record<string, string>)?.view ?? "";
  const { activeProjectId, setActiveProjectId } = useActiveProject();

  const onNavigator = pathname.startsWith("/navigator");
  const onNotes = pathname.startsWith("/notes");
  const onJournal = pathname.startsWith("/journal");
  const onLogbook = onNotes || onJournal;
  const [navigatorOpen, setNavigatorOpen] = useState(onNavigator);
  const [logbookOpen, setLogbookOpen] = useState(onLogbook);

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

  const isActive = (url: string) => {
    if (url === "/home") return pathname === "/" || pathname.startsWith("/home");
    return pathname.startsWith(url);
  };

  const isNavSubActive = (view: string) =>
    onNavigator && (searchView === view || (view === "browser" && searchView === ""));

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className={"flex items-center " + (collapsed && !isMobile ? "flex-col gap-1 p-1" : "justify-between px-2 py-3")}>
          <AppLogo collapsed={isMobile ? false : collapsed} />
          {!isMobile && (
            <button
              onClick={toggleSidebar}
              className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors cursor-pointer"
              aria-label="Toggle sidebar"
            >
              {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            </button>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        {(!collapsed || isMobile) && projects.length > 0 && (
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
                style={{ height: 32, fontSize: 13, paddingRight: 28, backgroundImage: "none" }}
                value={activeProjectId ?? ""}
                onChange={(e) => {
                  const id = e.target.value || null;
                  setActiveProjectId(id);
                }}
              >
                <option value="">— General —</option>
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
              {/* Flat items */}
              {flatItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={t(item.labelKey)}>
                    <Link to={item.url} className="flex items-center gap-2">
                      <item.icon className="h-4 w-4" />
                      <span>{t(item.labelKey)}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}

              {/* Logbook — expandable (Journal + Notes combined) */}
              <SidebarMenuItem>
                {collapsed ? (
                  <SidebarMenuButton asChild isActive={onLogbook} tooltip="Logbook">
                    <Link to="/journal" className="flex items-center gap-2">
                      <NotebookPen className="h-4 w-4" />
                      <span>Logbook</span>
                    </Link>
                  </SidebarMenuButton>
                ) : (
                  <>
                    <SidebarMenuButton
                      isActive={onLogbook}
                      onClick={() => setLogbookOpen((v) => !v)}
                      className="flex items-center gap-2 w-full"
                    >
                      <NotebookPen className="h-4 w-4" />
                      <span className="flex-1">Logbook</span>
                      {logbookOpen
                        ? <ChevronDown className="h-3.5 w-3.5 shrink-0" />
                        : <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
                    </SidebarMenuButton>
                    {logbookOpen && (
                      <SidebarMenuSub>
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton asChild isActive={onJournal && !(location.search as Record<string, string>)?.new}>
                            <Link to="/journal" className="flex items-center gap-2">
                              <NotebookText className="h-3.5 w-3.5" />
                              <span>My Journal</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton asChild isActive={(location.search as Record<string, string>)?.new === "1" && onJournal}>
                            <Link to="/journal" search={{ new: "1" }} className="flex items-center gap-2">
                              <FilePlus className="h-3.5 w-3.5" />
                              <span>New Journal Entry</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton asChild isActive={onNotes && !((location.search as Record<string, string>)?.new)}>
                            <Link to="/notes" className="flex items-center gap-2">
                              <LayoutList className="h-3.5 w-3.5" />
                              <span>My Notes</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton asChild isActive={(location.search as Record<string, string>)?.new === "1" && onNotes}>
                            <Link to="/notes" search={{ new: "1" }} className="flex items-center gap-2">
                              <FilePlus className="h-3.5 w-3.5" />
                              <span>New Note</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      </SidebarMenuSub>
                    )}
                  </>
                )}
              </SidebarMenuItem>

              {/* Navigator — expandable */}
              <SidebarMenuItem>
                {collapsed ? (
                  /* Collapsed: single icon linking to browser view */
                  <SidebarMenuButton
                    asChild
                    isActive={onNavigator}
                    tooltip={t("nav.navigator")}
                  >
                    <Link to="/navigator" search={{ view: "browser" }} className="flex items-center gap-2">
                      <Map className="h-4 w-4" />
                      <span>{t("nav.navigator")}</span>
                    </Link>
                  </SidebarMenuButton>
                ) : (
                  /* Expanded: collapsible group */
                  <>
                    <SidebarMenuButton
                      isActive={onNavigator}
                      onClick={() => setNavigatorOpen((v) => !v)}
                      className="flex items-center gap-2 w-full"
                    >
                      <Map className="h-4 w-4" />
                      <span className="flex-1">{t("nav.navigator")}</span>
                      {navigatorOpen
                        ? <ChevronDown className="h-3.5 w-3.5 shrink-0" />
                        : <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
                    </SidebarMenuButton>

                    {navigatorOpen && (
                      <SidebarMenuSub>
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton
                            asChild
                            isActive={isNavSubActive("browser")}
                          >
                            <Link
                              to="/navigator"
                              search={{ view: "browser" }}
                              className="flex items-center gap-2"
                            >
                              <LayoutList className="h-3.5 w-3.5" />
                              <span>Browser</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton
                            asChild
                            isActive={isNavSubActive("network")}
                          >
                            <Link
                              to="/navigator"
                              search={{ view: "network" }}
                              className="flex items-center gap-2"
                            >
                              <Share2 className="h-3.5 w-3.5" />
                              <span>Network</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      </SidebarMenuSub>
                    )}
                  </>
                )}
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="pb-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Return to experimental"
              onClick={() => {
                sessionStorage.removeItem("xcamp-ui-version");
                window.location.reload();
              }}
              style={{ color: "var(--skin-accent)" }}
            >
              <Sparkles className="h-4 w-4" />
              <span>Return to experimental</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={isActive("/profile")} tooltip={t("nav.profile")}>
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
    </Sidebar>
  );
}
