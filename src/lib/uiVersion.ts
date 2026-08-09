const KEY = "xcamp-ui-version";

// Call synchronously (in render body) when the ?ui= URL param is available.
// Idempotent — safe to call on every render.
export function initLegacyUi(ui: string | undefined): void {
  if (ui === "v1") sessionStorage.setItem(KEY, "v1");
}

// Returns true when the session is in legacy (v1) mode; false = experimental (default).
export function isLegacyUi(): boolean {
  return sessionStorage.getItem(KEY) === "v1";
}
