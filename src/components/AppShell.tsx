import { useEffect, useRef, useState, type ReactNode } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { initLegacyUi, isLegacyUi } from "@/lib/uiVersion";
import { ArrowLeft, Menu } from "lucide-react";
import { SidebarProvider, useSidebar } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { AppSidebarExperimental } from "@/components/AppSidebarExperimental";
import { useAuth } from "@/contexts/auth";
import { useBrand } from "@/lib/brand";
import { SidepanelProvider, useSidepanel } from "@/contexts/sidepanel";
import { RightPanelProvider, useRightPanel } from "@/contexts/right-panel";
import { CompanionRailProvider } from "@/contexts/companion-rail";
import { ItemSidepanel } from "@/components/sidepanel/ItemSidepanel";
import { EntityPanel } from "@/components/EntityPanel";
import { CompanionRail } from "@/components/companion/CompanionRail";
import { useIsMobile } from "@/hooks/use-mobile";
import { FullscreenDispatcher } from "@/components/FullscreenDispatcher";

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

// ── Right panel slot ──────────────────────────────────────────────────────────
// Desktop: layout aside that animates open/closed (no overlay/Sheet).
// Mobile: fullscreen overlay with a Back button.

const RIGHT_PANEL_WIDTH = 480;

function RightPanelSlot() {
  const { isOpen: sidepanelOpen, close: closeSidepanel } = useSidepanel();
  const { entityTarget, closeEntity } = useRightPanel();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const isVisible = sidepanelOpen || entityTarget !== null;

  const handleClose = entityTarget !== null ? closeEntity : closeSidepanel;

  const panelContent = entityTarget !== null ? (
    <EntityPanel
      onClose={closeEntity}
      type={entityTarget.type}
      id={entityTarget.id}
      objectiveId={entityTarget.objectiveId}
      prefillText={entityTarget.prefillText}
      initialTitle={entityTarget.initialTitle}
      user={user ?? undefined}
    />
  ) : sidepanelOpen ? (
    <ItemSidepanel />
  ) : null;

  if (isMobile) {
    if (!isVisible) return null;
    return (
      <div
        style={{
          position: "fixed", inset: 0, zIndex: 40,
          background: "var(--skin-surface)",
          display: "flex", flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "12px 16px", flexShrink: 0,
            borderBottom: "1px solid var(--skin-line)",
          }}
        >
          <button
            onClick={handleClose}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              background: "none", border: "none", cursor: "pointer",
              fontSize: 14, fontWeight: 500, color: "var(--skin-accent)", padding: "4px 0",
            }}
          >
            <ArrowLeft size={16} /> Back
          </button>
        </div>
        <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          {panelContent}
        </div>
      </div>
    );
  }

  return (
    <aside
      data-testid="right-panel-slot"
      style={{
        width: isVisible ? RIGHT_PANEL_WIDTH : 0,
        flexShrink: 0,
        overflow: "hidden",
        transition: "width 220ms ease",
        borderLeft: isVisible ? "1px solid var(--skin-line)" : "none",
        background: "var(--skin-surface)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {panelContent}
    </aside>
  );
}

// ── AppShell ──────────────────────────────────────────────────────────────────

/**
 * "surface" — standard route chrome: opaque --skin-surface background, sidebar
 *   open by default, main scrolls internally.
 * "transparent" — companion surface (/home): the route paints its own full-bleed
 *   hero background on <html>, so the shell must not cover it, and the sidebar
 *   starts collapsed. Everything else — right panel, companion rail, fullscreen
 *   task modal — is identical, which is the whole point of the variant.
 */
export type AppShellVariant = "surface" | "transparent";

export function AppShell({
  children,
  variant = "surface",
}: {
  children: ReactNode;
  variant?: AppShellVariant;
}) {
  const transparent = variant === "transparent";
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const brand = useBrand();
  const location = useRouterState({ select: (r) => r.location });
  const pathname = location.pathname;
  initLegacyUi((location.search as Record<string, string>)?.ui);
  const isLegacy = isLegacyUi();

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
      if (transparent) return false;
      const match = document.cookie.match(/(?:^|;\s*)sidebar_state=([^;]*)/);
      return match ? match[1] !== "false" : true;
    } catch {
      return !transparent;
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
    <SidepanelProvider>
      <RightPanelProvider>
        <CompanionRailProvider>
          <SidebarProvider
            defaultOpen={sidebarDefaultOpen}
            style={
              {
                "--sidebar-width": `${sidebarWidth}px`,
                ...(transparent ? { background: "transparent" } : {}),
              } as React.CSSProperties
            }
          >
            <SidebarStatePersist />
            {!pathname.startsWith("/profile") && <MobileMenuButton />}
            <div
              className="flex min-h-screen w-full"
              style={{ background: transparent ? "transparent" : "var(--skin-surface)" }}
            >
              {!isLegacy ? <AppSidebarExperimental /> : <AppSidebar />}
              <SidebarResizeHandle sidebarWidth={sidebarWidth} onMouseDown={handleResizeMouseDown} />
              <div
                className="flex-1 flex flex-col min-w-0"
                style={transparent ? { background: "transparent" } : undefined}
              >
                <div style={{ display: "flex", flex: 1, minHeight: 0, overflow: "hidden" }}>
                  <main
                    className="flex-1 min-w-0"
                    style={{
                      overflowY: "auto",
                      ...(transparent ? { background: "transparent" } : {}),
                    }}
                  >
                    {children}
                  </main>
                  <RightPanelSlot />
                </div>
              </div>
            </div>
            <CompanionRail />
            <FullscreenDispatcher />
          </SidebarProvider>
        </CompanionRailProvider>
      </RightPanelProvider>
    </SidepanelProvider>
  );
}
