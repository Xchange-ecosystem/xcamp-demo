// src/components/demo/DemoShell.tsx
import type { ReactNode } from "react";
import { SidepanelProvider } from "@/contexts/sidepanel";
import { RightPanelProvider } from "@/contexts/right-panel";
import { CompanionRailProvider } from "@/contexts/companion-rail";
import { SidebarProvider } from "@/components/ui/sidebar";

export function DemoShell({ children }: { children: ReactNode }) {
  return (
    <SidepanelProvider>
      <RightPanelProvider>
        <CompanionRailProvider>
          <SidebarProvider defaultOpen={false}>
            <div
              className="flex min-h-screen w-full flex-col"
              style={{ background: "var(--skin-surface)" }}
            >
              {children}
            </div>
          </SidebarProvider>
        </CompanionRailProvider>
      </RightPanelProvider>
    </SidepanelProvider>
  );
}
