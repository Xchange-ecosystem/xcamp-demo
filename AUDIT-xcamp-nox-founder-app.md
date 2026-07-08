# Audit: xcamp-nox-founder-app
Deployed on: Vercel (static SPA)   |   Runtime: Bun (no explicit version pin) / Vite build → browser JS

---

## 1. Secrets & API keys

| Secret name | Read at (file:line) | Set where | Unlocks | Shared? | Exposed/committed? |
|---|---|---|---|---|---|
| `VITE_SUPABASE_URL` | `src/lib/supabase.ts`:12, `src/lib/useHeroImage.ts`:8, `vendor/client/src/supabase/client.ts`:8 | `.env.example` (URL value committed); Vercel env vars | Supabase project REST, Auth, and Storage APIs | Shared with xcamp-backend et al. (same project) | URL committed in `.env.example`:5 and `supabase/config.toml`:1 — not a secret itself, but fingerprints the backend |
| `VITE_SUPABASE_ANON_KEY` | `src/lib/supabase.ts`:13, `src/lib/useHeroImage.ts`:9, `vendor/client/src/supabase/client.ts`:9 | Vercel env vars (blank in `.env.example`) | Supabase anon/RLS-gated access | Shared across all browser clients | Not committed; ships in the compiled JS bundle — public by design (Supabase anon key is intended to be public, protected by RLS) |
| `VITE_VOX_API_URL` | `src/integrations/vox/client.ts`:9, `vendor/client/src/vox/client.ts`:15 | `.env.example` (URL value committed); Vercel env vars | Chi/Vox AI API base URL | Unknown (shared if xcamp-sdk also reads it) | URL committed in `.env.example`:6 — not a secret |
| `VITE_BACKEND_URL` | Not consumed by any source code | `.env.example` only | Declared but unused | N/A | URL committed in `.env.example`:7 — vestigial; see §6 |

**No service-role key is present anywhere in this repo.** Confirmed by exhaustive grep of all source, vendor, and config files.

**No secrets hardcoded in source.** Three backend base URLs are hardcoded as constants (see §4), but these are non-secret hostnames, not API keys.

**Key generation / validation:** None in this repo. This is a pure browser SPA; all key validation is delegated to Supabase (JWT verification via RLS) and the backend APIs (chiapi, xcampapi).

**Notable raw key usage:**
- `src/lib/useHeroImage.ts`:37–38 — `VITE_SUPABASE_ANON_KEY` is sent as both `apikey` header and `Authorization: Bearer` in a raw `fetch` to Supabase Storage. Standard Supabase Storage pattern; the anon key is a public-facing credential, but it is visible in browser DevTools.

---

## 2. Auth & access flow

**Request identity mechanism:**
1. User submits email + password on the `/auth` route (`src/routes/auth.tsx`).
2. `signIn()` in `src/contexts/auth.tsx`:76 calls `supabase.auth.signInWithPassword()`.
3. Supabase returns a signed JWT `access_token`; stored in `localStorage` (configured in `src/lib/supabase.ts`:29 — `storage: localStorage, persistSession: true, autoRefreshToken: true`).
4. `buildXcampUser(session.user.id)` queries the `central_users` table to fetch `tenant_id`, `display_name`, `email`, `preferences` and assembles an `XcampUser` object in React context (`src/contexts/auth.tsx`:17–30).
5. All subsequent Supabase queries use the anon client with the session JWT auto-attached by `@supabase/supabase-js`.
6. All calls to external backends (chiapi, xcampapi, Vox) extract `session.access_token` and send it as `Authorization: Bearer <jwt>` (`src/lib/backcaster-api.ts`:56–63, `src/lib/organiser-api.ts`:40–47, `src/lib/journal-api.ts`:46–51, `src/integrations/vox/client.ts`:19–23).

**Roles/permissions present?:** No application-level role or permission system exists in this frontend. Only `tenantId` (for row-scoping) and `centralId` (as owner filter) are carried. All enforcement is delegated to Supabase RLS and the backend APIs.

**Supabase auth / service-role usage:**
- Supabase Auth is used for login/session management (`src/lib/supabase.ts`, `src/contexts/auth.tsx`).
- Only the anon key is present. No service-role key exists in this repo.
- JWT is verified server-side by Supabase; the frontend has no explicit JWT verification code.

**Tenant isolation:**
Isolation is implemented by attaching `.eq("tenant_id", user.tenantId)` on most Supabase queries. Examples:
- `listNotes` — `src/lib/xcamp-api.ts`:95–96
- `listProjects` — `src/lib/xcamp-api.ts`:274
- `listObjectivesWithCounts` — `src/lib/navigator-api.ts`:58–59

**Caller-trusted-without-verification spots:**
The `authUserId` passed to `resolveCentralUser()` (`src/lib/xcamp-api.ts`:22) originates from `session.user.id`, which is the JWT-verified Supabase auth UID — not caller-supplied. `tenantId` and `centralId` stored in context are loaded from the DB row for that auth UID; they are not accepted from the client.

**Queries lacking tenant/owner filters (RLS is the compensating control — if RLS is absent on these tables, any authenticated user can read/mutate other tenants' data):**

| Function | File:line | Missing filter |
|---|---|---|
| `listObjectiveTasks` | `src/lib/navigator-api.ts`:145–158 | No `tenant_id` on the `notes` SELECT |
| `listUnassignedProjectTasks` | `src/lib/navigator-api.ts`:160–179 | No `tenant_id` on the `notes` SELECT |
| `toggleNoteDone` | `src/lib/navigator-api.ts`:219–222 | No `tenant_id` or `owner_central_id` on the `notes` UPDATE |
| `getNoteById` | `src/lib/navigator-api.ts`:224–231 | No `tenant_id` on the `notes` SELECT |
| `getLinkedNoteIds` | `src/lib/xcamp-api.ts`:307–313 | No `tenant_id` on the `objective_notes` SELECT |
| `getSessionNoteTitles` | `src/lib/journal-api.ts`:246–260 | No `tenant_id`; only filters by `session_id` |

---

## 3. Deployment & drift

**Build/deploy method:**
- Platform: Vercel (static SPA)
- `vercel.json`: build command `bun run build`, install command `bun install`, output directory `dist`, catch-all SPA rewrite `/(.*) → /index.html`
- No Dockerfile, no server process, no DO droplet involvement

**Manual/undocumented steps:**
- No `.nvmrc`, `.node-version`, or `engines` field in `package.json`. Bun version is not pinned. If Vercel's Bun version drifts from the developer's local version, builds may differ silently.
- `VITE_BACKEND_URL` is documented in `.env.example` but is **not consumed** by any source file. Its presence may cause confusion about which env vars are actually required.

**Required env vars (must be set in Vercel → Settings → Environment Variables):**

| Variable | Boot-fatal if missing? | Note |
|---|---|---|
| `VITE_SUPABASE_URL` | Yes — throws at module load (`src/lib/supabase.ts`:16–24) | |
| `VITE_SUPABASE_ANON_KEY` | Yes — throws at module load (`src/lib/supabase.ts`:16–24) | |
| `VITE_VOX_API_URL` | No — logs a warning only (`src/integrations/vox/client.ts`:12–16); Vox calls will fail at use time | |
| `VITE_BACKEND_URL` | No — declared in `.env.example` but unused in code | Vestigial |

**Hardcoded backend URLs not overridable via env:**
- `https://xcampapi.xchange.eco/api/v1/backcaster` — `src/lib/backcaster-api.ts`:5
- `https://chiapi.xchange.eco` — `src/lib/organiser-api.ts`:5
- `https://chiapi.xchange.eco` — `src/lib/journal-api.ts`:8
- `https://xcamp.xchange.eco/app/project` — `src/lib/backcaster-api.ts`:392

These cannot be redirected for staging/dev environments without code changes.

---

## 4. Dependencies

**Calls out to:**

| Service | Base URL / env var | Auth mechanism | Source |
|---|---|---|---|
| Supabase (DB + Auth + Storage) | `VITE_SUPABASE_URL` (env) | Anon key + user JWT (auto-attached) | `src/lib/supabase.ts` |
| Chi/Vox AI API | `VITE_VOX_API_URL` (env) | `Authorization: Bearer <supabase-jwt>` | `src/integrations/vox/client.ts` |
| Xcamp Backcaster API | `https://xcampapi.xchange.eco/api/v1/backcaster` (hardcoded) | `Authorization: Bearer <supabase-jwt>` | `src/lib/backcaster-api.ts`:5 |
| Chi Organiser API | `https://chiapi.xchange.eco` (hardcoded) | `Authorization: Bearer <supabase-jwt>` | `src/lib/organiser-api.ts`:5 |
| Chi Journal API | `https://chiapi.xchange.eco` (hardcoded) | `Authorization: Bearer <supabase-jwt>` | `src/lib/journal-api.ts`:8 |
| Google Fonts CDN | `https://fonts.googleapis.com` / `https://fonts.gstatic.com` | None | `src/routes/__root.tsx`:92–98 |

**Called into by:**
Nothing. This is a browser-only static SPA with no inbound API surface, no SSR routes, no edge functions, and no webhooks. Users access it via a web browser only.

**Database / tables touched (Supabase project `ueebzuleyrnsrxbowdfa`):**

| Table | Operations | Source file |
|---|---|---|
| `central_users` | SELECT, UPDATE | `src/lib/xcamp-api.ts`:25, 35, 48 |
| `notes` | SELECT, INSERT, UPDATE | `src/lib/xcamp-api.ts`, `src/lib/navigator-api.ts` |
| `objectives` | SELECT, INSERT, UPDATE | `src/lib/xcamp-api.ts`:209, `src/lib/navigator-api.ts`:55, 109, 124 |
| `objective_notes` | SELECT, INSERT, DELETE | `src/lib/xcamp-api.ts`:173–203, `src/lib/navigator-api.ts`:67, 146 |
| `projects` | SELECT | `src/lib/xcamp-api.ts`:271, 284 |
| `project_notes` | SELECT, INSERT | `src/lib/navigator-api.ts`:162, 206 |
| `jarvix_conversations` | SELECT, INSERT, UPDATE | `src/lib/useCompanionSession.ts`:83, 179, 196 |
| `jarvix_messages` | SELECT, INSERT | `src/lib/useCompanionSession.ts`:106, 135, 148, 163 |
| `organiser_sessions` | SELECT | `src/lib/journal-api.ts`:215 |
| `organiser_proposals` | SELECT | `src/lib/journal-api.ts`:227, 248 |

**Supabase RPC functions called:**

| Function | Source |
|---|---|
| `upsert_objective_note` | `src/lib/executeProposal.ts`:17, 31 |
| `update_objective` | `src/lib/executeProposal.ts`:55 |

**Supabase Storage buckets accessed:**

| Bucket | Folder | Source |
|---|---|---|
| `App media` | `Hero` | `src/lib/useHeroImage.ts`:10–11 |

**Hardcoded schema assumptions:**
All table names above are hardcoded string literals. Any table rename in Supabase will silently break queries in this app without a compile-time error. RPCs `upsert_objective_note` and `update_objective` are also hardcoded by name.

---

## 5. Plain-language summary

xcamp-nox-founder-app is the user-facing web app for Xcamp/Nox — the interface founders use to manage projects, objectives, notes, tasks, and AI-assisted planning sessions. It is a pure browser application (no server) deployed as a static bundle on Vercel. It authenticates users through Supabase (email/password login) and uses the resulting token for all data access: querying the Supabase database directly for core data, and calling two external backend APIs (chiapi and xcampapi) for AI features. The single biggest auth/secrets risk is that several database query functions omit tenant-ID filters, meaning any valid logged-in user could potentially read or update another tenant's notes and tasks if Supabase Row Level Security (RLS) policies are not correctly configured on those tables — specifically `toggleNoteDone`, `getNoteById`, `listObjectiveTasks`, and `listUnassignedProjectTasks`. The app carries no service-role key and correctly delegates enforcement to Supabase, but that delegation is only safe if RLS is actually enabled and tested.

---

## 6. Open questions / not found

- **`VITE_BACKEND_URL` appears vestigial** — declared in `.env.example`:7 but not read by any source file. Was it used previously? Does something in the vendor directory consume it? It should be removed from documentation or wired up, to avoid confusion during environment setup.
- **RLS policy coverage is not visible in this repo** — no migration files or SQL schema are present (only `supabase/config.toml`). Whether RLS is enabled on `notes`, `objective_notes`, `project_notes`, `organiser_sessions`, `organiser_proposals`, `jarvix_conversations`, and `jarvix_messages` cannot be confirmed here. This is the highest-priority open question for the Vox7 migration.
- **No Bun version pin** — Vercel's default Bun version could drift from local dev. Recommend adding `"packageManager": "bun@<version>"` to `package.json` or a `.tool-versions` file.
- **`src/lib/useHeroImage.ts` uses `Authorization: Bearer <anon-key>`** at line 38, not a user JWT. This means the Storage list call is not scoped to the authenticated user's identity — it uses the static anon credential. This may be intentional (public media bucket), but should be confirmed.
- **External backend JWT validation** — this repo sends Supabase JWTs to chiapi and xcampapi as Bearer tokens, but whether those backends actually verify the JWT (signature, expiry, audience) vs. just checking that a token is present is not verifiable from this repo alone. Audit of xcamp-vox/xcamp-backend needed.
- **`vendor/` directory** — contains a copied Vox/Supabase client (`vendor/client/src/`). It reads the same `VITE_SUPABASE_ANON_KEY` and `VITE_VOX_API_URL` env vars. Its exact role (bundled SDK copy vs. local development alias) and version provenance are unclear.
