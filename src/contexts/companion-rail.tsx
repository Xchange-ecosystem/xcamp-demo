import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

/**
 * Publishes CompanionRail's current inline-panel width so routes that need to
 * shift their own layout out of the way (e.g. home.tsx's legacy centered-chat
 * column) can react to it, now that CompanionRail mounts once in AppShell
 * instead of being owned by a single route.
 */
interface CompanionRailCtx {
  panelWidth: number;
  setPanelWidth: (width: number) => void;
}

const CompanionRailContext = createContext<CompanionRailCtx | null>(null);

export function CompanionRailProvider({ children }: { children: ReactNode }) {
  const [panelWidth, setPanelWidth] = useState(0);
  const ctx = useMemo(() => ({ panelWidth, setPanelWidth }), [panelWidth]);
  return <CompanionRailContext.Provider value={ctx}>{children}</CompanionRailContext.Provider>;
}

function useCompanionRailCtx(): CompanionRailCtx {
  const ctx = useContext(CompanionRailContext);
  if (!ctx) throw new Error("useCompanionRail must be used inside <CompanionRailProvider>");
  return ctx;
}

// For layout consumers (e.g. home.tsx's legacy centered column).
export function useCompanionRailWidth(): number {
  return useCompanionRailCtx().panelWidth;
}

// For CompanionRail itself only — publishes its own width into the shared context.
export function useSetCompanionRailWidth(): (width: number) => void {
  return useCompanionRailCtx().setPanelWidth;
}
