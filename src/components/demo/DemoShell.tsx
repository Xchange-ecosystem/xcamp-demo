// src/components/demo/DemoShell.tsx
import type { ReactNode } from "react";
import { SidepanelProvider, useSidepanel } from "@/contexts/sidepanel";
import { RightPanelProvider } from "@/contexts/right-panel";
import { CompanionRailProvider } from "@/contexts/companion-rail";
import { SidebarProvider } from "@/components/ui/sidebar";
import { DemoNavRail, type DemoNavItem, type DemoPersona } from "@/components/demo/DemoNavRail";
import { useAmbientToasts } from "@/hooks/useAmbientToasts";
import { useDemoAltitude } from "@/hooks/useDemoAltitude";
import { ItemSidepanel } from "@/components/sidepanel/ItemSidepanel";
import { DemoFullscreenDispatcher } from "@/components/demo/DemoFullscreenDispatcher";
import { AltitudeRail } from "@/components/demo/AltitudeRail";
import { CompanionAltitudeShell } from "@/components/demo/companion/CompanionAltitudeShell";

interface DemoShellProps {
  persona: DemoPersona;
  items: DemoNavItem[];
  children: ReactNode;
}

const SIDEPANEL_WIDTH = 420;

// Mounts the same shared ItemSidepanel the real AppShell uses (see
// src/components/AppShell.tsx's RightPanelSlot) as an aside next to the demo
// content — DemoShell previously provided SidepanelProvider without ever
// rendering the panel it drives. DemoFullscreenDispatcher is the demo-only
// counterpart to the real, auth-gated FullscreenDispatcher (never mounted
// here) — see that file for why.
function DemoShellBody({ persona, items, children }: DemoShellProps) {
  const { isOpen } = useSidepanel();

  return (
    <div className="flex h-screen w-full overflow-hidden" style={{ background: "var(--skin-bg)" }}>
      <DemoNavRail persona={persona} items={items} />

      {/* Inset content area — muted page background behind, actual
          screen content floats in a rounded surface card with
          margin on all sides (Chromebook-file-browser-style inset),
          not full-bleed. */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col p-6 lg:p-8">
        {/* Sizing/clipping shell only — NOT the scroll container. Each
            route owns its own scroll region(s) (one for a single-column
            screen, two for a split like Founder Home's main content +
            right column) so independently scrolling regions don't nest
            inside a second scroller here, which would just drag them
            together again. */}
        <div
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
          style={{
            background: "var(--skin-surface)",
            borderRadius: "var(--skin-radius-lg, 22px)",
            border: "1px solid var(--skin-line)",
          }}
        >
          {children}
        </div>
      </div>

      {isOpen && (
        <aside
          style={{
            width: SIDEPANEL_WIDTH,
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            margin: "24px 24px 24px 0",
            borderRadius: "var(--skin-radius-lg, 22px)",
            border: "1px solid var(--skin-line)",
            overflow: "hidden",
          }}
        >
          <ItemSidepanel />
        </aside>
      )}

      <DemoFullscreenDispatcher />
    </div>
  );
}

export function DemoShell({ persona, items, children }: DemoShellProps) {
  // Keyed on `persona` — fires once on arrival at a persona's pages and
  // restarts only when persona actually changes (the Navrail switcher),
  // not on internal nav within one persona's own routes.
  useAmbientToasts(persona);

  // Companion-first guidance vs. Platform ecosystem level, Founder only —
  // see src/hooks/useDemoAltitude.ts (unrelated to src/store/altitudeStore.ts).
  const [altitude, setAltitude] = useDemoAltitude();
  const showAltitudeRail = persona === "founder";
  const isCompanionAltitude = persona === "founder" && altitude === "companion";

  return (
    <SidepanelProvider>
      <RightPanelProvider>
        <CompanionRailProvider>
          <SidebarProvider defaultOpen={false}>
            {/* `display: contents` — carries data-altitude without adding a
                box to the layout, so Platform altitude (the default, and the
                only altitude for non-founder personas) stays pixel-identical
                to before this feature existed. */}
            <div data-altitude={altitude} style={{ display: "contents" }}>
              {isCompanionAltitude ? (
                <CompanionAltitudeShell persona={persona} />
              ) : (
                <DemoShellBody persona={persona} items={items}>
                  {children}
                </DemoShellBody>
              )}
              {showAltitudeRail && <AltitudeRail altitude={altitude} onSelect={setAltitude} />}
            </div>
          </SidebarProvider>
        </CompanionRailProvider>
      </RightPanelProvider>
    </SidepanelProvider>
  );
}
