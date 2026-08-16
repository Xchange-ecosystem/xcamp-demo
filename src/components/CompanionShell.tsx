import type { ReactNode } from "react";
import { AppShell } from "@/components/AppShell";

/**
 * CompanionShell — the chrome for the companion surface (/home).
 *
 * This used to be a parallel implementation of AppShell. It mounted only the
 * sidebar and ItemSidepanel, so /home silently lacked the right panel, the
 * altitude dial and the fullscreen task modal that every other route has. Rather
 * than keep two shells in sync, it is now AppShell's "transparent" variant: same
 * capabilities everywhere, one code path, no drift. The variant keeps /home's
 * full-bleed hero background visible and its sidebar collapsed by default.
 */
export function CompanionShell({ children }: { children: ReactNode }) {
  return <AppShell variant="transparent">{children}</AppShell>;
}
