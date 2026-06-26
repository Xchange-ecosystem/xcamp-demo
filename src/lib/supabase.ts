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

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Startup guard: fail loudly at boot rather than with opaque runtime errors
// deep inside a query if either value is missing from the environment.
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  const missing = [
    ...(!SUPABASE_URL ? ["VITE_SUPABASE_URL"] : []),
    ...(!SUPABASE_ANON_KEY ? ["VITE_SUPABASE_ANON_KEY"] : []),
  ];
  const message = `Missing Supabase environment variable(s): ${missing.join(", ")}. Set them in your .env (local) and in Vercel → Settings → Environment Variables.`;
  console.error(`[Supabase] ${message}`);
  throw new Error(message);
}

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: typeof window !== "undefined" ? localStorage : undefined,
    persistSession: true,
    autoRefreshToken: true,
  },
});
