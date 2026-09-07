// src/components/demo/DemoShell.tsx
import type { ReactNode } from "react";
import { SidepanelProvider } from "@/contexts/sidepanel";
import { RightPanelProvider } from "@/contexts/right-panel";
import { CompanionRailProvider } from "@/contexts/companion-rail";
import { SidebarProvider } from "@/components/ui/sidebar";
import { DemoNavRail, type DemoNavItem, type DemoPersona } from "@/components/demo/DemoNavRail";

interface DemoShellProps {
  persona: DemoPersona;
  items: DemoNavItem[];
  children: ReactNode;
}

export function DemoShell({ persona, items, children }: DemoShellProps) {
  return (
    <SidepanelProvider>
      <RightPanelProvider>
        <CompanionRailProvider>
          <SidebarProvider defaultOpen={false}>
            <div className="flex min-h-screen w-full" style={{ background: "var(--skin-bg)" }}>
              <DemoNavRail persona={persona} items={items} />

              {/* Inset content area — muted page background behind, actual
                  screen content floats in a rounded surface card with
                  margin on all sides (Chromebook-file-browser-style inset),
                  not full-bleed. */}
              <div className="flex min-h-screen min-w-0 flex-1 flex-col p-6 lg:p-8">
                <div
                  className="min-h-0 flex-1 overflow-y-auto"
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
