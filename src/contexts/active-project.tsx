import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

const STORAGE_KEY = "xcamp-active-project";

export type NavMode = "ecosystem" | "project";

interface ActiveProjectValue {
  activeProjectId: string | null;
  setActiveProjectId: (id: string | null) => void;
  navMode: NavMode;
  setNavMode: (mode: NavMode) => void;
}

const ActiveProjectContext = createContext<ActiveProjectValue | undefined>(undefined);

export function ActiveProjectProvider({ children }: { children: ReactNode }) {
  const [activeProjectId, setActiveProjectIdState] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(STORAGE_KEY);
  });

  // navMode is independently toggleable — not derived from activeProjectId at runtime.
  // Initializes from whether a project was previously selected (so reload restores expected mode).
  const [navMode, setNavMode] = useState<NavMode>(() =>
    typeof window !== "undefined" && !!localStorage.getItem(STORAGE_KEY) ? "project" : "ecosystem",
  );

  const setActiveProjectId = (id: string | null) => {
    setActiveProjectIdState(id);
    if (typeof window !== "undefined") {
      if (id) localStorage.setItem(STORAGE_KEY, id);
      else localStorage.removeItem(STORAGE_KEY);
    }
  };

  // Keep state in sync if another tab changes it.
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === STORAGE_KEY) setActiveProjectIdState(e.newValue);
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const value = useMemo(
    () => ({ activeProjectId, setActiveProjectId, navMode, setNavMode }),
    [activeProjectId, navMode],
  );

  return <ActiveProjectContext.Provider value={value}>{children}</ActiveProjectContext.Provider>;
}

export function useActiveProject() {
  const ctx = useContext(ActiveProjectContext);
  if (!ctx) throw new Error("useActiveProject must be used within ActiveProjectProvider");
  return ctx;
}
