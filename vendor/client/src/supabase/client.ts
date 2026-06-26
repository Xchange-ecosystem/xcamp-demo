import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let _client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (_client) return _client;
  const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
  const url = env?.VITE_SUPABASE_URL;
  const key = env?.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('[xchange/client] Supabase env vars not set');
  _client = createClient(url, key);
  return _client;
}

/**
 * Returns the current session's access token.
 * Pass this as the TokenProvider to voxAuthFetch.
 */
export async function getSessionToken(): Promise<string | null> {
  const { data } = await getSupabaseClient().auth.getSession();
  return data.session?.access_token ?? null;
}
