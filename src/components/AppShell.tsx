import { useEffect, useRef, useState, type ReactNode } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { Menu } from "lucide-react";
import { SidebarProvider, useSidebar } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { useAuth } from "@/contexts/auth";
import { useBrand } from "@/lib/brand";

const DEFAULT_SIDEBAR_WIDTH = 256;

function MobileMenuButton() {
  const { toggleSidebar } = useSidebar();
  return (
    <button
      type="button"
      onClick={toggleSidebar}
      className="md:hidden fixed top-4 left-4 z-30 flex items-center justify-center rounded-full bg-black/30 backdrop-blur-sm p-2.5 text-white/90 hover:bg-black/50 transition-colors cursor-pointer"
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
  const pathname = useRouterState({ select: (r) => r.location.pathname });

  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    try {
      const stored = localStorage.getItem("nox-founder-sidebar-width");
      return stored ? parseInt(stored, 10) : DEFAULT_SIDEBAR_WIDTH;
    } catch {
      return DEFAULT_SIDEBAR_WIDTH;
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
      style={{ "--sidebar-width": `${sidebarWidth}px` } as React.CSSProperties}
    >
      {!pathname.startsWith("/profile") && <MobileMenuButton />}
      <div className="flex min-h-screen w-full" style={{ background: "var(--skin-surface)" }}>
        <AppSidebar />
        <SidebarResizeHandle sidebarWidth={sidebarWidth} onMouseDown={handleResizeMouseDown} />
        <div className="flex-1 flex flex-col min-w-0">
          <main className="flex-1 min-w-0">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
