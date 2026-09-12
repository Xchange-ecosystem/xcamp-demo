// src/contexts/investor-ecosystem.tsx
//
// Which ecosystem the Investor persona's nav switcher currently shows.
// Needs to be a Context (not a plain sessionStorage-backed hook like
// useDemoAltitude) because the switcher (rendered by InvestorShell, the
// route layout) and the ecosystem-scoped content it drives (rendered by
// child routes through <Outlet/>, so they can't receive it as a prop) are
// different components in the tree — a hook with its own useState per
// call site wouldn't notify one when the other changes it. Deliberately its
// own sessionStorage key, not the real app's ActiveProjectProvider
// (localStorage `xcamp-active-project`) — that context drives real Supabase
// project ids; conflating the two would let switching ecosystems in this
// fixture-only demo silently change what the real, authenticated app's
// sidebar has active.
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { ECOSYSTEMS } from "@/fixtures";

const STORAGE_KEY = "xcamp-demo-investor-ecosystem";
const DEFAULT_ECOSYSTEM_ID = ECOSYSTEMS[0].id;

function isKnownEcosystemId(value: string | null): value is string {
  return !!value && ECOSYSTEMS.some((e) => e.id === value);
}

function readInitial(): string {
  if (typeof window === "undefined") return DEFAULT_ECOSYSTEM_ID;
  const stored = window.sessionStorage.getItem(STORAGE_KEY);
  return isKnownEcosystemId(stored) ? stored : DEFAULT_ECOSYSTEM_ID;
}

interface InvestorEcosystemValue {
  ecosystemId: string;
  setEcosystemId: (id: string) => void;
}

const InvestorEcosystemContext = createContext<InvestorEcosystemValue | undefined>(undefined);

export function InvestorEcosystemProvider({ children }: { children: ReactNode }) {
  const [ecosystemId, setEcosystemId] = useState<string>(readInitial);

  useEffect(() => {
    window.sessionStorage.setItem(STORAGE_KEY, ecosystemId);
  }, [ecosystemId]);

  return (
    <InvestorEcosystemContext.Provider value={{ ecosystemId, setEcosystemId }}>
      {children}
    </InvestorEcosystemContext.Provider>
  );
}

export function useInvestorEcosystem(): [string, (next: string) => void] {
  const ctx = useContext(InvestorEcosystemContext);
  if (!ctx) {
    throw new Error("useInvestorEcosystem must be used within InvestorEcosystemProvider");
  }
  return [ctx.ecosystemId, ctx.setEcosystemId];
}
