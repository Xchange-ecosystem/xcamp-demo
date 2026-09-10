// src/hooks/useDemoAltitude.ts
//
// State for the demo's "altitude" layout switch (Companion-first guidance /
// App-style engagement (placeholder) / Platform ecosystem level) — a
// presentational, Founder-only layout mode chosen on AltitudeRail.
//
// NOT related to src/store/altitudeStore.ts, which is a different, older
// "altitude" concept (glide / cruise / cockpit) inherited from the
// xcamp-nox-founder-app clone, persisted separately, and governing how
// deeply Chi partners with the user (AI proactivity depth) — it is wired to
// CompanionRail's Altitude panel and ProjectEntryScreen's background tint.
// The two systems share a name by coincidence, not concept. Do not merge,
// rename, or read from one to satisfy the other.
import { useEffect, useState } from "react";
import type { DemoPersona } from "@/components/demo/DemoNavRail";

export type DemoAltitude = "companion" | "app" | "platform";

const STORAGE_KEY = "xcamp-demo-altitude";
const DEFAULT_ALTITUDE: DemoAltitude = "platform";

// Personas without a Companion-altitude shell (see DemoShell's
// isCompanionAltitude — Founder-only, CompanionAltitudeShell was built
// against Founder fixtures only). AltitudeRail keeps its "Companion" segment
// visible but disabled for these personas rather than hiding it (same
// treatment as the "App-style" placeholder — visible, deliberately inert,
// not removed and not hidden), and PersonaStartScreen's "Companion-first
// Guidance" tile disables off this same list so the two surfaces can't
// drift apart. Lives here (not in AltitudeRail.tsx, a component file) so
// importing it doesn't trip react-refresh/only-export-components.
export const NO_COMPANION_SHELL: DemoPersona[] = ["investor", "collaborator"];

function isDemoAltitude(value: string | null): value is DemoAltitude {
  return value === "companion" || value === "app" || value === "platform";
}

function readInitialAltitude(): DemoAltitude {
  if (typeof window === "undefined") return DEFAULT_ALTITUDE;
  const stored = window.sessionStorage.getItem(STORAGE_KEY);
  return isDemoAltitude(stored) ? stored : DEFAULT_ALTITUDE;
}

// Sets the altitude sessionStorage would otherwise only get written to by
// the hook's own effect (i.e. from inside a mounted DemoShell). Lets
// PersonaStartScreen — which renders *outside* DemoShell, before any
// persona shell exists to mount the hook — pick the altitude a persona
// arrives at their platform route with, e.g. jumping straight into the
// Companion altitude from the "Companion-first Guidance" start tile rather
// than through a live setter reference it has no way to hold.
export function writeInitialDemoAltitude(altitude: DemoAltitude): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(STORAGE_KEY, altitude);
}

export function useDemoAltitude(): [DemoAltitude, (next: DemoAltitude) => void] {
  const [altitude, setAltitude] = useState<DemoAltitude>(readInitialAltitude);

  useEffect(() => {
    window.sessionStorage.setItem(STORAGE_KEY, altitude);
  }, [altitude]);

  return [altitude, setAltitude];
}
