// Vox API integration entry point.
//
// Canonical place for Vox (chi/xcamp AI) HTTP calls. Reads the base URL from
// VITE_VOX_API_URL so the endpoint is environment-configurable (local / Vercel)
// instead of hardcoded per call site. Auth bearer comes from the Supabase
// session, matching the existing API clients in src/lib/*-api.ts.
import { supabase } from "@/lib/supabase";

const VOX_API_URL = import.meta.env.VITE_VOX_API_URL;

if (!VOX_API_URL) {
  // Non-fatal: log so a missing config surfaces, but don't crash the whole app
  // at boot — Vox is one feature surface, not core to every route.
  console.warn(
    "[Vox] VITE_VOX_API_URL is not set. Vox API calls will fail until it is configured.",
  );
}

async function authHeader(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** Thin fetch wrapper that prefixes VITE_VOX_API_URL and attaches the bearer token. */
export async function voxFetch(path: string, init: RequestInit = {}): Promise<Response> {
  if (!VOX_API_URL) {
    throw new Error("[Vox] VITE_VOX_API_URL is not configured.");
  }
  const headers = {
    "Content-Type": "application/json",
    ...(await authHeader()),
    ...(init.headers ?? {}),
  };
  return fetch(`${VOX_API_URL}${path}`, { ...init, headers });
}

export { VOX_API_URL };
