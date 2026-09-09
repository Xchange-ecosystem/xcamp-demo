// src/components/demo/DemoShell.tsx
import type { ReactNode } from "react";
import { SidepanelProvider } from "@/contexts/sidepanel";
import { RightPanelProvider } from "@/contexts/right-panel";
import { CompanionRailProvider } from "@/contexts/companion-rail";
import { SidebarProvider } from "@/components/ui/sidebar";
import { DemoNavRail, type DemoNavItem, type DemoPersona } from "@/components/demo/DemoNavRail";
import { useAmbientToasts } from "@/hooks/useAmbientToasts";

interface DemoShellProps {
  persona: DemoPersona;
  items: DemoNavItem[];
  children: ReactNode;
}

export function DemoShell({ persona, items, children }: DemoShellProps) {
  // Keyed on `persona` — fires once on arrival at a persona's pages and
  // restarts only when persona actually changes (the Navrail switcher),
  // not on internal nav within one persona's own routes.
  useAmbientToasts(persona);

  return (
    <SidepanelProvider>
      <RightPanelProvider>
        <CompanionRailProvider>
          <SidebarProvider defaultOpen={false}>
            <div
              className="flex h-screen w-full overflow-hidden"
              style={{ background: "var(--skin-bg)" }}
            >
              <DemoNavRail persona={persona} items={items} />

              {/* Inset content area — muted page background behind, actual
                  screen content floats in a rounded surface card with
                  margin on all sides (Chromebook-file-browser-style inset),
                  not full-bleed. */}
              <div className="flex min-h-0 min-w-0 flex-1 flex-col p-6 lg:p-8">
                {/* Sizing/clipping shell only — NOT the scroll container.
                    Each route owns its own scroll region(s) (one for a
                    single-column screen, two for a split like Founder
                    Home's main content + right column) so independently
                    scrolling regions don't nest inside a second scroller
                    here, which would just drag them together again. */}
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
            </div>
          </SidebarProvider>
        </CompanionRailProvider>
      </RightPanelProvider>
    </SidepanelProvider>
  );
}
