/**
 * Vox HTTP clients for the xcamp AI backend.
 * Reads VITE_VOX_API_URL from the host app's environment.
 *
 * voxFetch        — unauthenticated (health, public endpoints)
 * voxAuthFetch    — attaches Supabase Bearer token (context-aware endpoints)
 *
 * Both accept a getToken callback so the client package has no direct Supabase
 * auth dependency — the host app (harness, foundation, founder-app) provides the token.
 */

export type TokenProvider = () => Promise<string | null>;

const baseUrl = (): string => {
  const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
  const url = env?.VITE_VOX_API_URL;
  if (!url) throw new Error('[xchange/client] VITE_VOX_API_URL is not set');
  return url.replace(/\/$/, '');
};

export async function voxFetch<T>(
  path: string,
  body: Record<string, unknown>,
): Promise<T> {
  const res = await fetch(`${baseUrl()}/api${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`[voxFetch] ${path} → ${res.status}`);
  return res.json() as Promise<T>;
}

export async function voxAuthFetch<T>(
  path: string,
  body: Record<string, unknown>,
  getToken: TokenProvider,
): Promise<T> {
  const token = await getToken();
  if (!token) throw new Error('[voxAuthFetch] No auth token available');
  if (!('altitude' in body)) {
    console.warn('[xchange/client] voxAuthFetch called without altitude in body:', path);
  }
  const res = await fetch(`${baseUrl()}/api${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`[voxAuthFetch] ${path} → ${res.status}`);
  return res.json() as Promise<T>;
}
