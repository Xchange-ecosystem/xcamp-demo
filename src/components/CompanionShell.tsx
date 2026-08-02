import { useEffect, type ReactNode } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { Menu } from "lucide-react";
import { SidebarProvider, useSidebar } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { AppSidebarExperimental } from "@/components/AppSidebarExperimental";
import { useAuth } from "@/contexts/auth";
import { useBrand } from "@/lib/brand";

const SIDEBAR_COLLAPSED_KEY = "nox-founder-sidebar-collapsed";

function MobileMenuButton() {
  const { toggleSidebar } = useSidebar();
  return (
    <button
      type="button"
      onClick={toggleSidebar}
      className="md:hidden fixed top-4 left-4 z-30 flex items-center justify-center rounded-full p-2.5 cursor-pointer"
      style={{
        background: "var(--glass-pill-bg)",
        border: "1px solid var(--glass-pill-border)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        color: "var(--glass-text)",
      }}
      aria-label="Open menu"
    >
      <Menu size={18} />
    </button>
  );
}

function SidebarStatePersist() {
  const { state } = useSidebar();
  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, state === "collapsed" ? "true" : "false");
    } catch {}
  }, [state]);
  return null;
}

export function CompanionShell({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const brand = useBrand();
  const navSearch = useRouterState({ select: (r) => r.location.search as Record<string, string> });
  const navVariant = navSearch?.nav ?? "";

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  if (loading || !user) {
    return (
      <div
        className="flex min-h-screen flex-col items-center justify-center gap-4"
        style={{ color: "var(--skin-ink-soft)", background: "var(--skin-surface)" }}
      >
        <img src={brand.iconUrl} alt={brand.name} className="h-12 w-12 object-cover rounded-lg" />
        <h1 className="text-xl font-semibold" style={{ color: "var(--skin-ink)" }}>
          {brand.name}
        </h1>
      </div>
    );
  }

  const sidebarDefaultOpen = (() => {
    try {
      const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
      return stored !== null ? stored !== "true" : false;
    } catch {
      return false;
    }
  })();

  return (
    <SidebarProvider
      defaultOpen={sidebarDefaultOpen}
      style={{
        "--sidebar-width": "256px",
        background: "transparent",
      } as React.CSSProperties}
    >
      <SidebarStatePersist />
      <MobileMenuButton />
      <div
        className="flex min-h-screen w-full"
        style={{ background: "transparent" }}
      >
        {navVariant === "experimental" ? <AppSidebarExperimental /> : <AppSidebar />}
        <div className="flex-1 flex flex-col min-w-0" style={{ background: "transparent" }}>
          <main className="flex-1 min-w-0" style={{ background: "transparent" }}>{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
