# AUDIT — xcamp-nox-founder-app
**Date:** 2026-07-16  
**Auditor:** Claude (AI-assisted audit, investigation-only — no code changes)  
**Branch audited:** main  
**Supersedes:** previous AUDIT-xcamp-nox-founder-app.md

---

## 1. Secrets & API Keys

| Variable | Where set | Value / notes |
|---|---|---|
| `VITE_SUPABASE_URL` | `.env.example` (committed) | `https://ueebzuleyrnsrxbowdfa.supabase.co` — Supabase project ref **leaked in plaintext** in committed file |
| `VITE_SUPABASE_ANON_KEY` | `.env.example` blank | Must be provided via Vercel env dashboard; not committed |
| `VITE_VOX_API_URL` | `.env.example` | `https://chiapi.xchange.eco/api` — chi-orchestration endpoint, **not direct vox7** |
| `VITE_BACKEND_URL` | `.env.example` | `https://xcampapi.xchange.eco` |

**Finding:** The Supabase project reference (`ueebzuleyrnsrxbowdfa`) is permanently in git history via `.env.example`. The anon key is not committed. The anon key is designed to be public (Supabase RLS enforces access), but the project ref leak means anyone can enumerate the Supabase API surface.

---

## 2. Auth & Access Flow

The app uses a **Supabase-native auth** model:

1. `src/lib/supabase.ts` creates a Supabase client from `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`. Auth session is persisted in `localStorage`.
2. All Vox/chi-orchestration calls go through `src/integrations/vox/client.ts` → `voxFetch(path, init)`, which reads the current Supabase session and attaches `session.access_token` as a `Bearer` token.
3. The token is a Supabase-issued JWT (ES256). chi-orchestration's `/proxy/:appId/*` routes verify it against the Supabase JWKS endpoint.
4. **The frontend never calls vox7 directly.** All AI/memory calls go to `https://chiapi.xchange.eco/api` (chi-orchestration).

**Session failure behavior:** `src/lib/supabase.ts` throws a hard error at boot if `VITE_SUPABASE_URL` or `VITE_SUPABASE_ANON_KEY` are missing — no silent degradation.

---

## 3. Deployment & Drift

- **Platform:** Vercel (SPA)
- **Build:** `bun run build`, install: `bun install` (from `vercel.json`)
- **SPA routing:** `vercel.json` rewrites all `/(.*) → /index.html`
- **Env vars required in Vercel dashboard:**
  - `VITE_SUPABASE_URL` (or rely on committed value in `.env.example`)
  - `VITE_SUPABASE_ANON_KEY` (**must** be set — blank in example)
  - `VITE_VOX_API_URL`
  - `VITE_BACKEND_URL`

**Known drift risk:** The committed `.env.example` contains `VITE_SUPABASE_URL` — the project ref is baked in. The anon key must be separately set in Vercel.

---

## 4. Dependencies

Package versions from `package.json` (last checked 2026-07-16):

| Package | Version | Notes |
|---|---|---|
| React | 19.2 | Latest major; hooks API only |
| Vite | 7.3 | Build tool |
| TanStack Router | 1.168 | File-based routing |
| @supabase/supabase-js | 2.108 | Auth + DB client |
| Zustand | 5 | State management |
| Zod | 3.24 | Schema validation |
| i18next | 26 | Internationalization |
| react-hook-form | 7.71 | Forms |
| Radix UI | full suite | Headless UI primitives |
| Recharts | — | Charts |
| TipTap editor | — | Rich text editing |

No obviously vulnerable packages flagged at audit time. Recommend running `bun audit` on a schedule.

---

## 5. Plain-Language Summary

This is a React 19 SPA deployed on Vercel. It authenticates users with Supabase (email/password or OAuth), then passes Supabase JWTs to the chi-orchestration proxy for all AI/memory operations. The frontend never touches vox7 directly. Build tooling is Bun/Vite; routing is file-based via TanStack Router.

**Key facts:**
- All AI calls route through chi-orchestration (`https://chiapi.xchange.eco/api`), not vox7 directly.
- Supabase project ref is committed in `.env.example` (low severity — anon key not committed).
- Boot fails loudly if env vars are missing — no silent degradation.
- `voxFetch` in `src/integrations/vox/client.ts` is the single entry point for all vox/chi calls.

---

## 6. Open Questions / Not Found

- **`VITE_SUPABASE_ANON_KEY` in Vercel dashboard:** Must be verified. Production auth will fail if unset.
- **`VITE_BACKEND_URL` in Vercel dashboard:** Not visible in repo; must be confirmed to be set to `https://xcampapi.xchange.eco`.
- **Supabase RLS policies:** Not visible in this repo. Must be audited separately against the Supabase project to verify access control is correctly enforced.
- **bun version pinning:** `vercel.json` does not pin bun version; Vercel's default bun version may drift between deploys.
- **`/api` vs `/proxy/:appId` routing at chi:** Frontend uses `/api` path prefix — this hits the unauthenticated S2S routes on chi, not the per-app proxy routes. Is this intentional? If the frontend token is not being verified at chi, memory writes are scoped only by the Supabase JWT that vox7 sees.
