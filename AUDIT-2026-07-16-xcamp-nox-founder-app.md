# Audit Report: xcamp-nox-founder-app

## 1. Audit Metadata

| Field | Value |
|---|---|
| Repository | `Xchange-ecosystem/xcamp-nox-founder-app` |
| Branch audited | `main` (checked out as `claude/xcamp-nox-repo-audit-iqg3fy`) |
| HEAD commit | `5764a87fa15129db8c842efdce853f55118aa1bb` |
| Commit date | 2026-07-14 17:06:09 +0200 |
| Commit message | `Merge pull request #31 from Xchange-ecosystem/claude/journal-analyse-phase-6-3-k9rrrw` |
| Audit date | 2026-07-16 |
| Tools used | Bash, Read, Grep, Glob (read-only; no code modified) |

---

## 2. Findings by Section

### A. Repo Shape & Ownership Boundary

**Top-level structure (confirmed present):**

| Path | Present | Notes |
|---|---|---|
| `src/integrations/` | ✓ | `supabase/` and `vox/` subdirs only |
| `src/entities/` | ✓ | `altitude.ts` only |
| `src/features/` | ✓ | **Empty** — only a `README.md` describing intent |
| `src/shared/ui/` | ✓ | Four files: `ActionPillButton.tsx`, `CreateProjectTile.tsx`, `ProjectCard.tsx`, `Typewriter.tsx` |
| `src/components/` | ✓ | Contains the bulk of actual UI code (10 subdirs) |
| `src/routes/` | ✓ | TanStack Router file-based routes |
| `src/lib/` | ✓ | API clients, hooks, theme, i18n |
| `src/store/` | ✓ | `altitudeStore.ts` only |
| `src/contexts/` | ✓ | `auth.tsx`, `active-project.tsx` |
| `src/hooks/` | ✓ | 4 files |
| `src/types/` | ✓ | `modules.d.ts`, `xcamp.ts` |
| `vendor/` | ✓ | Vendor-synced SDK copies (`client`, `companion`, `ui`) |
| `supabase/migrations/` | **NOT FOUND** | Only `supabase/config.toml` exists |
| `src/app/` | **NOT FOUND** | No such directory |
| `apps/harness/` | **NOT FOUND** | No `apps/` directory at all |

**DIVERGED FROM ASSUMPTION — Boundary violations:**

- **`src/features/` is empty.** The README in it describes the intended structure (one dir per feature: `backcaster/`, `journal/`, `navigator/`, `vox-chat/`), but zero feature modules have been created there. All actual feature UI lives under `src/components/` (`companion/`, `navigator/`, `editor/`, `organiser/`, `altitude/`, `quickroad/`, `profile/`). The CC-owns / Lovable-owns boundary exists only as documentation, not in practice.
- **`src/components/ui/`** contains shadcn/ui primitives (Radix wrappers). This is the correct place for generic primitives, but the boundary between `src/components/` (features) and `src/shared/ui/` (cross-feature) is effectively ignored — most shared UI is in `src/components/` directly.
- No Vox client code sits outside `src/integrations/vox/` for the local client. CONFIRMED: `src/integrations/vox/client.ts` is the canonical location.

---

### B. Vox Integration & Auth Bug

**`src/integrations/vox/client.ts` usage** — CONFIRMED + BUG FOUND:

`src/integrations/vox/client.ts:26-36` is a thin `fetch` wrapper:
```
export async function voxFetch(path: string, init: RequestInit = {}): Promise<Response> {
  ...
  return fetch(`${VOX_API_URL}${path}`, { ...init, headers });
}
```
It concatenates `VITE_VOX_API_URL` directly with `path` — no `/api` prefix added.

`src/hooks/useVox.ts:6` calls it as:
```
const res = await voxFetch("/api/answer-with-context", { method: "POST", ... });
```

**DOUBLE `/api` PREFIX — CONFIRMED BUG:**  
`.env.example:7` sets `VITE_VOX_API_URL=https://chiapi.xchange.eco/api`.  
Resulting URL: `https://chiapi.xchange.eco/api` + `/api/answer-with-context` = **`https://chiapi.xchange.eco/api/api/answer-with-context`**.

By contrast, `vendor/client/src/vox/client.ts:44` explicitly appends `/api`:
```
const res = await fetch(`${baseUrl()}/api${path}`, ...);
```
expecting `path` to be something like `/answer-with-context` (without `/api`). The two clients have **incompatible path conventions**. If `VITE_VOX_API_URL` is set with the `/api` suffix (as `.env.example` documents), the local `useVox.ts` double-prefixes. If it's set without the suffix, the local client is correct but the vendor client would double-prefix.

**Auth mechanism sent by this repo** — CONFIRMED:  
`src/integrations/vox/client.ts:19-23` sends the Supabase user JWT as `Authorization: Bearer <token>`. This is a per-user JWT, NOT a static API key. Whether the backend (`nox-api`) validates this JWT versus a static `API_SECRET_KEY` is outside this repo's scope, but the token type is confirmed: Supabase JWT.

---

### C. Chat / Companion Surface

**Message type names** — DIVERGED FROM ASSUMPTION:

Actual interface names at `src/components/companion/ChatThread.tsx:12-33`:
- `ChiMsg` (not `ChiMessage`)
- `UserMsg` (not `UserMessage`)
- `ComponentMsg` (not `ComponentMessage`)
- Union type: `ChatMessage` (exported as the public API)

These are correct in function but diverge from the assumed names.

**Persistence to `jarvix_*` tables** — CONFIRMED:
- `jarvix_conversations`: SELECT at `useCompanionSession.ts:83-90`, INSERT at `useCompanionSession.ts:196-198`, UPDATE at `useCompanionSession.ts:179-181`.
- `jarvix_messages`: SELECT at `useCompanionSession.ts:106-110`, INSERT at `useCompanionSession.ts:135-137`, `useCompanionSession.ts:148-150`, `useCompanionSession.ts:163-165`.
- Columns written: `id`, `conversation_id`, `role`, `content`, `content_type`, `component_type`, `component_payload`, `tenant_id`. All hardcoded string literals.
- NOTE: Generated Supabase types are stale (do not include `status`, `content_type` columns). Code casts through `unknown` at every write call — fragile if column names change.

**Session restore from `project_id`** — CONFIRMED:  
`useCompanionSession.ts:100`: `convProjectId = convRows[0].project_id ?? null`  
`home.tsx:136-144`: Checks `session.conversationProjectId`, finds the matching project, restores state.

**`projectRestoredRef` guard** — CONFIRMED:  
`home.tsx:110`: `const projectRestoredRef = useRef(false);`  
Set at `home.tsx:139`: `projectRestoredRef.current = true;` immediately after restoring project from session.  
Guard at `home.tsx:246-249`:
```tsx
if (projectRestoredRef.current) {
  projectRestoredRef.current = false;
  return;
}
```
This sits in the sidebar-sync `useEffect` and correctly skips the duplicate `handleProjectSelect` → Vox call on restore. The guard is real and functioning.

---

### D. Design Tokens & DesignThemeProvider

**Gravity tokens — on `#8b3dd9` ramp** — CONFIRMED:  
`vendor/ui/src/skin/gravity.ts:8-13`:
```ts
export const GRAVITY: GravityTokens = {
  bg:     '#f5eefc',
  border: '#8b3dd9',
  ink:    '#260d40',
  soft:   '#612c96',
};
```
All four values confirmed correct. No amber values anywhere in the gravity token definition.

**Amber gravity references** — NOT FOUND:  
Exhaustive search across `src/` and `vendor/` for `amber`, `#f59e0b`, `#d97706`, `#fbbf24` returned zero results. The known off-brand amber error is not present in the current codebase. PARTIAL caveat: skin `warn` tokens are brownish-orange (`SCIENTIFIC_TOKENS.warn: '#b25a1f'`, `PLAYFUL_TOKENS.warn: '#c2691f'` at `vendor/ui/src/skin/tokens.ts:31,80`) — these are NOT amber and are correctly named as warn tokens, not gravity.

**DesignThemeProvider** — NOT FOUND; replaced by local static CSS:

`src/main.tsx:6-9` explicitly documents: *"@xchange/ui does not yet export a DesignThemeProvider."*

The in-use `ThemeProvider` (`src/lib/theme.tsx:26-61`) only toggles the `.dark` CSS class on `document.documentElement`. It does NOT call `applySkin()` or write any `--skin-*` / `--gravity-*` CSS custom properties.

Instead, skin tokens are **hardcoded as static CSS rules** in `src/styles.css:109-188`:
- `:root` block (light, Scientific/Platform): `--skin-accent: #4de0c1`, gradient `linear-gradient(135deg, #34acbf, #4de0c1)`, etc.
- `.dark` override block: `--skin-accent: #b689e6`, gradient `linear-gradient(135deg, #731f7d, #b689e6, #34acbf)`.

**`--gravity-*` tokens are never written to the DOM.** `vendor/ui/src/skin/apply.ts:85-88` defines how `applySkin()` writes them, but `applySkin()` is called nowhere in this repo. Components in `vendor/companion/src/components/CompanionCardStack.tsx:104-107` reference `var(--gravity-bg)` and `var(--gravity-border)` — these will resolve to empty/invalid in a live browser unless the host explicitly calls `applySkin()`. **This is a silent rendering gap for any gravity moment cards.**

What's missing for a canonical CSS-variable writer:
1. No runtime paradigm/tone switching (tokens are static in CSS).
2. `--gravity-*` tokens not written anywhere.
3. `DARK_BRAND_TOKENS` (`vendor/ui/src/skin/tokens.ts:117-127`) not wired up.

**Altitude dial visibility** — CONFIRMED; NO background-image switching:  
`src/components/altitude/FloatingAltitudeDial.tsx:5-31`: A button using Tailwind classes (`bg-emerald-500`, `bg-teal-500`, `bg-blue-500` per altitude 0/1/2) that cycles altitude via `useAltitudeStore`. No background-image switching is performed by the dial itself.

**Background-image switching** — CONFIRMED with specifics:  
- `useHeroImage.ts:10-11`: Reads from Supabase bucket `"App media"` → folder `"Hero"` (hardcoded strings).
- Bucket listing via raw `fetch` to Supabase Storage API, using the anon key as both `apikey` header and Bearer token (`useHeroImage.ts:36-38`).
- `home.tsx:65-69`: `projectBgUrl = activeProject?.feature_image` when inside a project — overrides the hero image.
- `home.tsx:73-85`: Background applied via `document.documentElement.style.cssText +=` on `bgUrl` change; cleaned up on unmount.
- Persist-until-reload: The module-level `cachedUrls` variable (`useHeroImage.ts:16`) caches bucket file list for the page lifetime. No explicit persist beyond this — reload re-fetches. NOT localStorage-persisted.
- "Switch-on-project-entry" is implemented via the `step === "inside-project"` condition at `home.tsx:66-68`, not via an altitude change.

---

### E. xcamp-sdk Harness Integration (PR #9)

**NOT FOUND in this repo:**

- No `apps/` directory exists.
- No `apps/harness/` or any harness code.
- No Health / Sync / Pipeline Trace tabs.
- No `api/vox-admin.ts` or any Vercel serverless function.
- No `VOX_ADMIN_SECRET` reference anywhere in any file.
- No wiring to "real data" vs. placeholders for admin tabs.

**Conclusion:** The harness (PR #9 scope) appears to live in a different repository (likely `xcamp-sdk` or a separate `xcamp-harness` repo). It is entirely absent from `xcamp-nox-founder-app`. No verification of `VOX_ADMIN_SECRET` matching `API_SECRET_KEY` is possible from this repo — neither value is present.

---

### F. Objective Modal / Detail Views Port Status

**ObjectiveModal and related spec components** — NOT FOUND:

Searched across all of `src/` and `vendor/` for: `ObjectiveModal`, `QuickPanel`, `AgreementBar`, `FullView`, `YourMoveCard`.

**Zero results found.** The June 2026 Objectives redesign spec (adaptive quick-panel-to-fullscreen, shared-element morph) is **NOT shipped** in this repo. It exists only as a design prototype/artifact external to this codebase.

**What actually exists for objectives:**

| Component | File | Description |
|---|---|---|
| `ObjectiveEditor` | `src/components/navigator/ObjectiveEditor.tsx` | Inline editor for title/status fields within the navigator |
| `NavigatorBrowser` | `src/components/navigator/NavigatorBrowser.tsx` (599 lines) | Main navigator UI; uses `ResizablePanelGroup` for a two-pane layout |
| `TaskPanel` | `src/components/navigator/TaskPanel.tsx` | Task list panel within navigator |
| `ColumnToolbar` | `src/components/navigator/ColumnToolbar.tsx` | Search/sort/filter toolbar for objectives column |

The `NavigatorBrowser` uses `ResizablePanelGroup` / `ResizablePanel` for a resizable side-by-side layout, NOT a quick-panel-to-fullscreen morph. There is no portal, no fullscreen overlay, no shared-element transition. The existing UI reads live Supabase data via `navigator-api.ts`.

**Task/note detail views from xcamp-foundation** — NOT PORTED:  
Note editing is via `NoteEditor` embedded inline in `TaskPanel` inside `NavigatorBrowser`. There is no sidepanel + fullscreen modal pattern from xcamp-foundation. This is PARTIAL — notes open inline in the navigator panel rather than in a dedicated fullscreen modal.

---

### G. Known Technical Debt

**Bundle sizes** — UNVERIFIABLE (no build artifact):  
No `dist/` directory present in the repo. Cannot confirm the ~437 kB `NoteEditor` or ~569 kB `index` chunks without running a build.

Code-splitting status: `vite.config.ts:10` enables `TanStackRouterVite({ autoCodeSplitting: true })`, which auto-splits each route. However, no explicit `React.lazy()` or `import()` calls were found for heavy components like `NoteEditor` (which imports multiple `@tiptap` packages) or `NoteEditor` within `TaskPanel`. Intra-route code splitting has NOT been done.

**Rewind sync cron** — NOT FOUND:  
- No `.github/` directory in the repo.
- No GitHub Actions workflow files of any kind.
- `vercel.json` contains only: `buildCommand`, `installCommand`, `outputDirectory`, and a catch-all SPA rewrite. No cron jobs.
- Zero matches for `process-one`, `sync/process`, `rewind`, or `cron` in any source file.
- The "Rewind sync cron hitting `POST /api/sync/process-one` every 2 minutes" is entirely absent from this repo. If it exists, it is in a different repository.

---

### H. General Hygiene

*(See Section 5 for full incidental notes. Key items inline:)*

**TODO/FIXME found incidentally:**
- `home.tsx:264`: `// TODO CR-H10: show toast and open side panel` — after `executeProposal` succeeds, no user feedback is given.
- `home.tsx:389`: `onCreateProject={() => {/* CC-3 scope */}}` — Create Project shortcut is a no-op.
- `ChatThread.tsx:102`: `{/* Static orb placeholder — pulsing animation wired in CC-2 with TTS */}` — static chi orb, not animated.
- `ChatThread.tsx:236`: `<StubComponent label="Backcaster flow — coming in CC-3" />` — backcaster message type is a stub.
- `project.$projectId.tsx:285,298`: AI tag suggestion endpoint stub.
- `GenerateStep.tsx:207`: `TODO: replace reloadHero with a real generate-image call`.

---

## 3. Corrections Needed to the Standing Knowledge Base

- **Message type names were believed to be `ChiMessage`, `UserMessage`, `ComponentMessage`; actually `ChiMsg`, `UserMsg`, `ComponentMsg`** (union: `ChatMessage`) at `src/components/companion/ChatThread.tsx:12-33`.

- **`src/features/` was believed to be populated; actually it is empty** — only a README exists. All feature code lives under `src/components/`.

- **`supabase/migrations/` was believed to exist; actually it does not.** Only `supabase/config.toml` (one line: project ID) is present.

- **`src/app/` was believed to exist; actually it does not.**

- **DesignThemeProvider was believed to be a placeholder waiting for `@xchange/ui` to export it; more precisely, it doesn't exist AT ALL.** Skin tokens are hardcoded in `src/styles.css` as static CSS variables. The `applySkin()` function from vendor is never called, meaning `--gravity-*` tokens are undefined at runtime.

- **`--gravity-*` CSS tokens were believed to be written at runtime; actually they are never written in this repo.** Any component referencing `var(--gravity-border)` etc. silently gets no color.

- **The double `/api` prefix bug was previously described as a risk; it is CONFIRMED.** With `VITE_VOX_API_URL=https://chiapi.xchange.eco/api` (as documented in `.env.example`) and `useVox.ts` calling `voxFetch("/api/answer-with-context", ...)`, the constructed URL is `https://chiapi.xchange.eco/api/api/answer-with-context`.

- **The harness (PR #9) was believed to be part of this repo; it is entirely absent.** No `apps/`, no `api/vox-admin.ts`, no `VOX_ADMIN_SECRET`. The harness lives elsewhere.

- **The ObjectiveModal / quick-panel-to-fullscreen was believed to possibly be shipped; it is NOT present.** Zero component code for `ObjectiveModal`, `QuickPanel`, `AgreementBar`, `FullView`, or `YourMoveCard` exists.

- **The Rewind sync cron ("POST /api/sync/process-one every 2 min") was believed to be in this repo; it is NOT.** No cron config of any kind exists here.

- **`VITE_BACKEND_URL` was believed to be vestigial (prior audit noted it as unused); it IS used** in two call sites: `JournalFlow.tsx:163` and `home.tsx:261`, both passing it to `executeProposal()` from `@xchange/client`. It is not vestigial.

- **A second env var `VITE_BACKEND_API_URL` is in active use but NOT documented in `.env.example`.** Used by `src/lib/journal-api.ts:9` and `src/lib/organiser-api.ts:7`. If not set in Vercel, it silently defaults to empty string, making all journal/organiser API calls fail. This env var is entirely undocumented.

- **Amber gravity references were believed to be present (prior "known off-brand error"); none found.** The gravity token ramp is correctly on `#8b3dd9` purple. Skin `warn` tokens are brownish-orange but that is correct (warn ≠ gravity).

---

## 4. Open Questions

1. **Is `VITE_VOX_API_URL` set WITH or WITHOUT the `/api` suffix in Vercel's production environment?** The `.env.example` documents it WITH `/api` (`https://chiapi.xchange.eco/api`), making `useVox.ts` double-prefix. If Vercel's secret is set WITHOUT `/api`, then `useVox.ts` works but the vendor client would not. Whoever configured Vercel knows the answer; it cannot be determined from this repo alone.

2. **Is `VITE_BACKEND_API_URL` set in Vercel?** It is used by `journal-api.ts` and `organiser-api.ts` but absent from `.env.example`. If missing from Vercel, the Journal and Organiser flows silently fail all API calls (requests go to `""` = relative URLs).

3. **Are `--gravity-*` CSS tokens broken in production?** `applySkin()` is never called, so `--gravity-*` are undefined. If any gravity-moment cards render via `CompanionCardStack`, they will appear without color. Needs browser verification.

4. **RLS coverage on `jarvix_conversations` and `jarvix_messages`.** No migration files are present to confirm RLS is enabled. The `useCompanionSession.ts` queries filter by `owner_central_id` and `tenant_id` at the application layer, but without RLS, any authenticated user could read another user's conversation history.

5. **`AUDIT-xcamp-nox-founder-app.md` at the repo root** — a prior security audit report (12,660 bytes) is committed to the repository and will be publicly visible if the repo is public. This file documents specific security findings, missing filters, and hardcoded backend URLs. Confirm whether this should remain committed.

6. **Are Supabase generated types being updated?** Multiple call sites cast through `unknown` because generated types are stale (`status`, `content_type` columns missing). The `src/integrations/supabase/types.ts` file appears out of sync with the live schema. A `supabase gen types` run is overdue.

7. **Where does the harness live?** PR #9 content is absent from this repo. Confirm which repo hosts `apps/harness/` and whether `VOX_ADMIN_SECRET` is configured there.

---

## 5. Incidental Hygiene Notes

| Location | Issue |
|---|---|
| `src/lib/organiser-api.ts:5` | Hardcodes `https://chiapi.xchange.eco` in a comment but reads `VITE_BACKEND_API_URL` — the comment URL may be wrong if the env var points elsewhere |
| `src/lib/backcaster-api.ts:5` | Hardcodes `https://xcampapi.xchange.eco/api/v1/backcaster` — not overridable per environment |
| `src/lib/backcaster-api.ts:392` | Hardcodes `https://xcamp.xchange.eco/app/project` — staging/dev links will point to production |
| `src/lib/journal-api.ts:8` | Hardcodes `https://chiapi.xchange.eco` in comments while reading `VITE_BACKEND_API_URL` |
| `src/routes/home.tsx:46-48` | Clears `localStorage.removeItem("xcamp-active-project")` at module evaluation time (outside any function) — runs on every page load including non-home routes that import this module |
| `vendor/ui/src/skin/tokens.ts:117-127` | `DARK_BRAND_TOKENS` exported but not consumed anywhere in this repo |
| `src/store/altitudeStore.ts` | Altitude persisted to `localStorage` under key `'nox-founder-altitude'`, but `home.tsx:94` hardcodes `const altitude = 1 as const` — the store value is ignored on the home route |
| `src/routes/project.$projectId.tsx:289` | AI tag suggestions button present in UI but triggers nothing (TODO comment at line 298) |
| `src/components/quickroad/GenerateStep.tsx:207` | `reloadHero` used as a placeholder for a real image generation call |
| `.env.example` | Documents `VITE_BACKEND_URL` and `VITE_VOX_API_URL` but not `VITE_BACKEND_API_URL` — incomplete |
| `package.json` | No `engines` field and no Bun version pin; Vercel's Bun version may drift |
| `AUDIT-xcamp-nox-founder-app.md` (root) | Prior security audit committed to repo — may expose internal security findings if repo is public |
