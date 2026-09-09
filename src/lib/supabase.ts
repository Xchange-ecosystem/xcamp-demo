// Single Supabase client for the app (client-only Vite SPA).
//
// Reads from Vite-exposed env vars only. In a client-only build, the bundle
// runs in the browser, so there is no `process.env` — every secret/config
// value the client needs must be `VITE_`-prefixed and set in Vercel.
//
// Import like this:
//   import { supabase } from "@/lib/supabase";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

// Deliberately unresolvable stand-ins used only when the env vars are missing.
// `.invalid` is a reserved TLD (RFC 2606) that is guaranteed never to resolve,
// so any code that actually reaches the network gets a real DNS failure rather
// than silently talking to something unexpected. Both must still be shaped like
// valid credentials — createClient() itself throws on an empty key or on a URL
// that isn't http(s) — which would just reintroduce the boot crash below.
const PLACEHOLDER_URL = "https://placeholder.invalid";
const PLACEHOLDER_ANON_KEY = "missing-supabase-anon-key";

/**
 * Resolve the client config, tolerating a missing environment.
 *
 * This module used to `throw` at import time when either var was absent, which
 * took down the entire app rather than the feature that needed the backend:
 * every route died with a blank page — including routes that never talk to
 * Supabase at all — because a bare `import { supabase }` anywhere in the module
 * graph was enough to trigger it before React ever mounted.
 *
 * Instead we construct a client pointed at unresolvable placeholders and log
 * loudly. Routes that never touch the backend boot and render normally; routes
 * that do get a genuine failing network call, which surfaces as an ordinary
 * (visible, catchable) request error instead of a synchronous boot crash.
 *
 * This is not a silent degrade. Vite inlines `import.meta.env.VITE_*` at build
 * time, so a production build made without the vars bakes in this branch and
 * the console.error fires on every page load in production, not just in dev.
 *
 * The logging lives inside this function rather than at module top level on
 * purpose: package.json sets `sideEffects: false` and vite.config.ts narrows
 * `treeshake.moduleSideEffects` to i18n only, so a top-level statement that
 * feeds no used export may legally be dropped from the bundle. Its return value
 * feeds createClient() below, which makes the call — and the warning — load-bearing.
 */
function resolveSupabaseConfig(): { url: string; anonKey: string; configured: boolean } {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    const missing = [
      ...(!url ? ["VITE_SUPABASE_URL"] : []),
      ...(!anonKey ? ["VITE_SUPABASE_ANON_KEY"] : []),
    ];
    console.error(
      `[Supabase] Missing environment variable(s): ${missing.join(", ")}. ` +
        `Set them in your .env (local) and in Vercel → Settings → Environment Variables. ` +
        `Every Supabase-backed feature (sign-in, notes, objectives, projects) will fail ` +
        `until this is fixed — requests are pointed at ${PLACEHOLDER_URL} and cannot succeed.`,
    );
    return { url: PLACEHOLDER_URL, anonKey: PLACEHOLDER_ANON_KEY, configured: false };
  }

  return { url, anonKey, configured: true };
}

const config = resolveSupabaseConfig();

/**
 * Whether the client was built from a real environment. False means every
 * Supabase call will fail by design — useful for a guard or banner at a call
 * site that wants to say so rather than just letting the request error out.
 */
export const isSupabaseConfigured = config.configured;

export const supabase = createClient<Database>(config.url, config.anonKey, {
  auth: {
    storage: typeof window !== "undefined" ? localStorage : undefined,
    persistSession: true,
    autoRefreshToken: true,
  },
});
