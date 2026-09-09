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

export type DemoAltitude = "companion" | "app" | "platform";

const STORAGE_KEY = "xcamp-demo-altitude";
const DEFAULT_ALTITUDE: DemoAltitude = "platform";

function isDemoAltitude(value: string | null): value is DemoAltitude {
  return value === "companion" || value === "app" || value === "platform";
}

function readInitialAltitude(): DemoAltitude {
  if (typeof window === "undefined") return DEFAULT_ALTITUDE;
  const stored = window.sessionStorage.getItem(STORAGE_KEY);
  return isDemoAltitude(stored) ? stored : DEFAULT_ALTITUDE;
}

export function useDemoAltitude(): [DemoAltitude, (next: DemoAltitude) => void] {
  const [altitude, setAltitude] = useState<DemoAltitude>(readInitialAltitude);

  useEffect(() => {
    window.sessionStorage.setItem(STORAGE_KEY, altitude);
  }, [altitude]);

  return [altitude, setAltitude];
}
