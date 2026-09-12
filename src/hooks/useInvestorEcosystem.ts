// src/hooks/useInvestorEcosystem.ts
//
// Which ecosystem the Investor persona's nav switcher currently shows —
// same lightweight sessionStorage-backed hook pattern as useDemoAltitude
// (a Context/Provider would work too, but every consumer here already sits
// under a single shared route tree and none of them need to be notified of
// changes they didn't cause themselves, so the simpler hook is enough).
// Deliberately its own sessionStorage key, not the real app's
// ActiveProjectProvider (localStorage `xcamp-active-project`) — that context
// drives real Supabase project ids; conflating the two would let switching
// projects in this fixture-only demo silently change what the real,
// authenticated app's sidebar has active.
import { useEffect, useState } from "react";
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

export function useInvestorEcosystem(): [string, (next: string) => void] {
  const [ecosystemId, setEcosystemId] = useState<string>(readInitial);

  useEffect(() => {
    window.sessionStorage.setItem(STORAGE_KEY, ecosystemId);
  }, [ecosystemId]);

  return [ecosystemId, setEcosystemId];
}
