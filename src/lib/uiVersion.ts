const KEY = "xcamp-ui-version";

// Values of ?ui= that take the session back out of legacy mode. `reset` is the
// explicit escape hatch; `v2` is accepted as the natural counterpart to `v1`.
const RESET_VALUES: readonly string[] = ["reset", "v2"];

// Call synchronously (in render body) when the ?ui= URL param is available.
// Idempotent — safe to call on every render.
export function initLegacyUi(ui: string | undefined): void {
  if (ui === "v1") sessionStorage.setItem(KEY, "v1");
  else if (ui && RESET_VALUES.includes(ui)) sessionStorage.removeItem(KEY);
}

// Returns true when the session is in legacy (v1) mode; false = experimental (default).
export function isLegacyUi(): boolean {
  return sessionStorage.getItem(KEY) === "v1";
}

// Clear legacy mode and drop any ?ui= param, so a reload/share of the current
// URL does not re-arm the trap. Used by the sidebar's "Return to experimental"
// button and by the ?ui=reset boot handler.
export function exitLegacyUi(navigate = true): void {
  sessionStorage.removeItem(KEY);
  if (typeof window === "undefined") return;

  const url = new URL(window.location.href);
  url.searchParams.delete("ui");
  // replace() rather than reload(): the flag is read at render time, so we need
  // the app to re-evaluate from a URL that no longer carries the param.
  if (navigate) window.location.replace(url.toString());
  else window.history.replaceState(null, "", url.toString());
}

/**
 * Boot handler for the ?ui= param, run once from main.tsx before the router
 * mounts. Reading window.location directly means the escape hatch cannot be
 * defeated by a route's validateSearch dropping an unrecognised ?ui= value.
 *
 * ?ui=v1          → enter legacy mode (sticky for the session)
 * ?ui=reset|v2    → leave legacy mode and strip the param from the URL
 */
export function initUiVersionFromUrl(): void {
  if (typeof window === "undefined") return;

  const ui = new URLSearchParams(window.location.search).get("ui");
  if (!ui) return;

  if (ui === "v1") {
    sessionStorage.setItem(KEY, "v1");
    return;
  }
  if (!RESET_VALUES.includes(ui)) return;

  // Already a fresh document load — rewrite the URL in place instead of
  // triggering a second navigation.
  exitLegacyUi(false);
}
