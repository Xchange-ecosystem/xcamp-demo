import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { PageHeroShell } from "@/components/PageHeroShell";
import { NavigatorBrowser } from "@/components/navigator/NavigatorBrowser";
import { NavigatorGraph } from "@/components/navigator/NavigatorGraph";
import { LayoutList, Share2 } from "lucide-react";
import { useBrand } from "@/lib/brand";

type NavigatorView = "browser" | "network";

export const Route = createFileRoute("/navigator")({
  head: () => ({
    meta: [
      { title: "Navigator — Xcamp" },
      {
        name: "description",
        content: "Browse project objectives and tasks and open them to edit details.",
      },
    ],
  }),
  validateSearch: (search: Record<string, unknown>): { view: NavigatorView } => ({
    view: search.view === "network" ? "network" : "browser",
  }),
  component: NavigatorPage,
});

function NavigatorPage() {
  const { view } = Route.useSearch();
  const navigate = useNavigate({ from: "/navigator" });
  const brand = useBrand();

  const setView = (v: NavigatorView) => {
    void navigate({ search: { view: v }, replace: true });
  };

  const viewToggle = (
    <div style={{ display: "flex", gap: 4 }}>
      <ViewToggleButton
        active={view === "browser"}
        title="Browser view"
        onClick={() => setView("browser")}
      >
        <LayoutList size={15} />
      </ViewToggleButton>
      <ViewToggleButton
        active={view === "network"}
        title="Network graph view"
        onClick={() => setView("network")}
      >
        <Share2 size={15} />
      </ViewToggleButton>
    </div>
  );

  if (view === "network") {
    return (
      <AppShell>
        <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
          {/* Header row with view toggles */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "0 16px",
              height: 48,
              borderBottom: "1px solid var(--skin-line)",
              background: "var(--skin-surface)",
              flexShrink: 0,
            }}
          >
            <span style={{ fontSize: 15, fontWeight: 600, color: "var(--skin-ink)", flex: 1 }}>
              Navigator
            </span>
            {viewToggle}
          </div>

          {/* Active view */}
          <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
            <NavigatorGraph />
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeroShell
        logo={<img src={brand.logoUrl} alt={brand.name} className="h-6 sm:h-8 w-auto" />}
        title="Navigator"
        subtitle="Browse project objectives and tasks and open them to edit details."
        actions={viewToggle}
      >
        <div style={{ height: "calc(100vh - 340px)", minHeight: 420 }}>
          <NavigatorBrowser hideHeader />
        </div>
      </PageHeroShell>
    </AppShell>
  );
}

function ViewToggleButton({
  children,
  active,
  title,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  title: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-pressed={active}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 30,
        height: 30,
        borderRadius: 7,
        border: `1px solid ${active ? "var(--skin-accent)" : "var(--skin-line)"}`,
        background: active ? "var(--skin-accent-faint, rgba(78,193,211,0.1))" : "transparent",
        color: active ? "var(--skin-accent)" : "var(--skin-ink-faint)",
        cursor: "pointer",
        transition: "border-color 0.15s, background 0.15s, color 0.15s",
      }}
    >
      {children}
    </button>
  );
}
