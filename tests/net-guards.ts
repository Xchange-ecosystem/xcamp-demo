// Shared network guards for the B4 demo verification specs.
//
// Two separate nets, deliberately kept apart so a failure names what it caught:
// isOffAppRequest ("this screen talked to something that isn't the dev server")
// and isBackendRequest ("this screen talked to a backend"). A screen can fail
// the first without failing the second — a stray CDN asset, say — and the
// distinction matters when triaging.
import type { Request } from "@playwright/test";

const DEV_SERVER = /^https?:\/\/(localhost|127\.0\.0\.1):5173\//;

// The one legitimate off-app origin: the webfont <link> in index.html, which is
// app-wide chrome predating all of this and is a static asset CDN, not a
// backend. Allowlisted by exact host, so any other origin still fails.
const FONT_HOSTS = /^https:\/\/fonts\.(googleapis|gstatic)\.com\//;

const BACKEND_PATTERNS =
  /supabase|demo-verification\.invalid|\/auth\/v1|\/rest\/v1|\/rpc\/|\/functions\/v1/i;

export function isOffAppRequest(req: Request): boolean {
  const url = req.url();
  if (url.startsWith("data:") || url.startsWith("blob:")) return false;
  if (FONT_HOSTS.test(url)) return false;
  return !DEV_SERVER.test(url);
}

// Requests to the dev server itself are module loads, not backend traffic.
// Vite serves source by path, so /src/lib/supabase.ts and the
// @supabase_supabase-js dep bundle both come back as localhost GETs whose URLs
// contain "supabase" — they mean the module was imported, not that anything was
// queried. Excluding localhost is what makes this check mean "talked to a
// backend" rather than "loaded a file with that name".
//
// That import is real and worth knowing about (DemoShell mounts ItemSidepanel,
// which statically imports @/lib/supabase, which is why the demo cannot boot
// without Supabase env vars) — but it is a bundling coupling, not a network
// call, and this assertion is about the latter.
export function isBackendRequest(req: Request): boolean {
  const url = req.url();
  if (DEV_SERVER.test(url)) return false;
  return BACKEND_PATTERNS.test(url);
}

// Vite dev cold-transforms this module graph in ~25s in the session container,
// so the default 5s visibility timeout reads a slow screen as a blank one.
// Loose enough for a slow sandbox, still fatal for a screen that never renders.
export const RENDER_TIMEOUT = 60_000;

// The blocked webfont surfaces as a bare Event rather than a JS exception, on
// every page in this sandbox, so it can never be distinguished from a real
// error by presence alone. Filter bare Events; real Errors still fail.
export function isRealPageError(err: unknown): boolean {
  const text = String(err);
  return text !== "Event" && text !== "[object Event]";
}
