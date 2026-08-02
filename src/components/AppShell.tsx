import { useEffect, useRef, useState, type ReactNode } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { Menu } from "lucide-react";
import { SidebarProvider, useSidebar } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { AppSidebarExperimental } from "@/components/AppSidebarExperimental";
import { useAuth } from "@/contexts/auth";
import { useBrand } from "@/lib/brand";

const SIDEBAR_COLLAPSED_KEY = "nox-founder-sidebar-collapsed";

function SidebarStatePersist() {
  const { state } = useSidebar();
  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, state === "collapsed" ? "true" : "false");
    } catch {}
  }, [state]);
  return null;
}

const DEFAULT_SIDEBAR_WIDTH = 256;

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

function SidebarResizeHandle({
  sidebarWidth,
  onMouseDown,
}: {
  sidebarWidth: number;
  onMouseDown: (e: React.MouseEvent) => void;
}) {
  const { state } = useSidebar();
  if (state === "collapsed") return null;
  return (
    <div
      onMouseDown={onMouseDown}
      style={{
        position: "fixed",
        left: sidebarWidth - 3,
        top: 0,
        bottom: 0,
        width: 6,
        cursor: "col-resize",
        zIndex: 20,
      }}
      className="sidebar-resize-handle"
    />
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const brand = useBrand();
  const location = useRouterState({ select: (r) => r.location });
  const pathname = location.pathname;
  const navVariant = (location.search as Record<string, string>)?.nav ?? "";

  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    try {
      const stored = localStorage.getItem("nox-founder-sidebar-width");
      return stored ? parseInt(stored, 10) : DEFAULT_SIDEBAR_WIDTH;
    } catch {
      return DEFAULT_SIDEBAR_WIDTH;
    }
  });

  const [sidebarDefaultOpen] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
      if (stored !== null) return stored !== "true";
      // Fallback: honour the shadcn cookie if localStorage has never been written
      const match = document.cookie.match(/(?:^|;\s*)sidebar_state=([^;]*)/);
      return match ? match[1] !== "false" : true;
    } catch {
      return true;
    }
  });

  const currentWidth = useRef(sidebarWidth);
  useEffect(() => {
    currentWidth.current = sidebarWidth;
  }, [sidebarWidth]);
  const isResizing = useRef(false);

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;

    const onMouseMove = (ev: MouseEvent) => {
      if (!isResizing.current) return;
      const newWidth = Math.min(Math.max(ev.clientX, 180), window.innerWidth * 0.3);
      setSidebarWidth(newWidth);
    };

    const onMouseUp = () => {
      isResizing.current = false;
      localStorage.setItem("nox-founder-sidebar-width", String(currentWidth.current));
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  };

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
          {brand.name} App
        </h1>
      </div>
    );
  }

  return (
    <SidebarProvider
      defaultOpen={sidebarDefaultOpen}
      style={{ "--sidebar-width": `${sidebarWidth}px` } as React.CSSProperties}
    >
      <SidebarStatePersist />
      {!pathname.startsWith("/profile") && <MobileMenuButton />}
      <div className="flex min-h-screen w-full" style={{ background: "var(--skin-surface)" }}>
        {navVariant === "experimental" ? <AppSidebarExperimental /> : <AppSidebar />}
        <SidebarResizeHandle sidebarWidth={sidebarWidth} onMouseDown={handleResizeMouseDown} />
        <div className="flex-1 flex flex-col min-w-0">
          <main className="flex-1 min-w-0">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
