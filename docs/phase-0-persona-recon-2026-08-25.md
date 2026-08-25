# Phase 0 — Persona Awareness Recon

**Date:** 2026-08-25
**Type:** Read-only recon report. No product code changed in this session.
**Runs after:** PR #99 (shell parity), PR #100 (welcome fix + layout audit), plus PR #109/#110
(companion hero container / Companion Project scope) merged since.
**`origin/main` HEAD used for all source claims:** `126f7c4` (merge of PR #110), 2026-08-25.
**Production deployment checked:** `https://xcamp-nox-founder-app.vercel.app/` — confirmed
below (Part A, methodology note) to be serving `126f7c4` at content level, `last-modified:
2026-08-25T07:18:15Z`.

Two prior audit docs in this repo (`docs/phase-0-audit-2026-08-09.md`,
`docs/welcome-duplication-and-layout-audit-2026-08-17.md`) have already been found to contain
stale claims. This report corrects several assumptions in its own brief — see the
`DIFFERENT`-tagged rows and the callouts in Part B. Take every `CONFIRMED` here as time-boxed to
`126f7c4` / 2026-08-25, not as permanent.

---

## Methodology note — how "live" was verified without login credentials

This session had no user credentials for the production app. Two independent techniques were
used instead, both stronger than source-grep alone:

1. **Content-diff against production.** `origin/main` was built locally (`bun install && bun run
   build`), and the resulting chunks were byte-diffed against the chunks actually served by
   `https://xcamp-nox-founder-app.vercel.app/` after normalizing hashed import filenames (the
   same method the 2026-08-17 deployment-verification doc used). Result: **0–132 bytes differ
   per chunk, all of them minifier-assigned identifier renames** (e.g. `Ht`↔`b0`, `P`↔`A`) — no
   literal string or logic differs. This is decisive evidence prod is running `126f7c4`, not
   circumstantial.
   ```
   $ curl -I https://xcamp-nox-founder-app.vercel.app/
   HTTP/2 200
   last-modified: Tue, 25 Aug 2026 07:18:15 GMT
   x-vercel-cache: MISS
   ```
   Custom domain `xcamp.xchange.eco` is still unreachable from this sandbox (`CONNECT` → 502,
   same proxy-policy block the 2026-08-17 doc documented) — not re-litigated here, still `BLOCKED`
   for anyone without unrestricted egress or Vercel dashboard access.

2. **Real authenticated DOM render, via `tests/helpers/liveAuth.ts` against a local build.**
   Playwright/Chromium against the external host gets `net::ERR_CONNECTION_RESET` through this
   sandbox's proxy (same finding as 2026-08-17). But `bun run preview` on `127.0.0.1` bypasses the
   proxy entirely, and the repo's own `tests/helpers/liveAuth.ts` harness (a fake Supabase
   session + stubbed REST calls, already built for exactly this) let Chromium render the **real,
   unmodified production bundle** fully logged in. This is not a mock UI — it's the actual
   `126f7c4` React tree executing against a fake backend, screenshotted and DOM-queried directly.
   Screenshots referenced below are attached to this session.

Everything tagged `CONFIRMED` in Part A used one or both of these. Where only source-grep was
possible, it's tagged accordingly (grep is sufficient to prove absence, not renders — per brief
rule 2).

---

## Part A — Right-edge rail

| Control | Exists in `src`? | Mounted where | Removed in which commit/PR | Renders live on `/home` today? |
|---|---|---|---|---|
| `CompanionRail` (`src/components/companion/CompanionRail.tsx`) | **Yes** — full file, 531 lines, actively maintained (last touched `e22f821`, 2026-08-08) | `src/routes/home.tsx:759`, but **only inside `{isLegacy && ...}`** | **Not removed.** Gated off by `346f035` "flip experimental UI to default; legacy reachable via `?ui=v1`" (PR #94, merged 2026-08-09) | **No**, by default. **Yes**, under `/home?ui=v1` — confirmed live (see below) |
| `RAIL_ITEMS` array (brief calls it `RAIL_ICONS` — that name never existed, confirmed via `git log -S"RAIL_ICONS"` → zero hits) | Yes, `CompanionRail.tsx:17` | same file | n/a | n/a (internal to the component) |
| `"My mood"` / `"My role"` / tooltip `"Switch your mode between founder, collaborator or investor (paid plan)."` | Yes, verbatim | same file | n/a | Same as `CompanionRail` — legacy-only |
| `RolePanel` / `MoodPanel` | Yes, `CompanionRail.tsx:84`/`155` | children of `CompanionRail` | n/a | Legacy-only |

**A1 — verdict: `DIFFERENT` from the brief's premise.** The brief's framing ("if it's gone, find
when") assumes deletion. It isn't deleted. It's orphaned-by-default: still imported, still
functional, still wired to real code (the "Detail" tab even opens the real `ItemSidepanel` via
the shared `useSidepanel()` context) — but wrapped in `{isLegacy && ...}`, and `isLegacyUi()`
(`src/lib/uiVersion.ts`) defaults to `false` and is only ever `true` for a session where someone
explicitly visited `?ui=v1`. A brand-new logged-in user will never see it.

Live confirmation, `/home` (default, no `?ui=v1`), authenticated via the local-build harness —
`svg.lucide-rocket`, `svg.lucide-zap`, `svg.lucide-panel-right-open` all return **0** matches
anywhere in the DOM; screenshot shows a plain Project-Home view with no right-edge tab at all.
Reloading the identical page at `/home?ui=v1` — `rocketIcon: 1, zapIcon: 2,
panelRightOpenIcon: 1`, and the screenshot shows exactly the single rounded, hairline-divided,
three-icon strip flush to the right edge described in the brief's "Status when built" column.
**Rendering is real and matches the original PR #85 spec — it's just unreachable from the default
entry point.**

**A2 — when/how, and deliberate vs. collateral.**
```
$ git log --follow --diff-filter=A --oneline -- src/components/companion/CompanionRail.tsx
7fa5f2f feat: add companion rail (Detail/Role/Mood) with centered-chat re-centering   (2026-08-08, PR #85)

$ git log -S"isLegacy && (" --oneline -- src/routes/home.tsx | tail -1
346f035 feat: flip experimental UI to default; legacy reachable via ?ui=v1            (2026-08-09, PR #94)
```
PR #85 built the rail on 2026-08-08. The very next day, PR #94 flipped the *entire* new
`EcosystemHomeView` / `ProjectHomeView` experience to be the default and demoted the whole
previous "default companion mode" UI (centered chat + rail) behind `?ui=v1`. **This reads as
collateral, not a deliberate rail-specific decision** — the commit message and diff are about the
UI-version flip generally; the rail just happened to live inside the block that got gated. There
is no commit that discusses the rail's fate specifically. Tag: `UNCLEAR — NEEDS HUMAN INPUT`
whether product intended for it to stay reachable via the legacy escape hatch indefinitely, or
whether it should be revived, deleted, or reimplemented against the new views.

**A3 — `RightPanelProvider` / `RightPanelSlot` vs. the PR #85 rail: unrelated systems, not
successor/predecessor.** `RightPanelSlot` (`src/components/AppShell.tsx:85-161`) is a **docked
`<aside>`** that AppShell renders unconditionally for every route (`AppShell.tsx:291`), width
animating 0↔480px based on `useSidepanel()`/`useRightPanel()` context state. It shows either
`ItemSidepanel` or `EntityPanel`. It existed before and is orthogonal to `CompanionRail` — the
rail's own "Detail" tab happens to drive the *same* `useSidepanel()` context, so clicking it
closes the rail's tab and opens `RightPanelSlot`'s docked panel, but the rail's Role/Mood tabs are
a completely separate `position:fixed` overlay the rail renders itself, sharing no code with
`RightPanelSlot`.

Actual right-edge component tree today, both routes go through the same `AppShell`:
- **`/home`**: `home.tsx` → `<CompanionShell>` (= `<AppShell variant="transparent">`) →
  `RightPanelProvider` → `RightPanelSlot` (docked, width 0 unless something's open) +
  `FloatingAltitudeDial` (fixed, bottom-right) +, only if `?ui=v1`, `<CompanionRail>` (fixed,
  right-edge tab strip, its own separate overlay).
- **`/navigator`**: `navigator.tsx` → `<AppShell>` (surface variant) → same
  `RightPanelProvider`/`RightPanelSlot`/`FloatingAltitudeDial`. **No `CompanionRail` import at
  all** — `grep -rln "CompanionRail" src/routes/` returns only `home.tsx`. Confirmed live: on
  `/navigator`, `railTab: 0` even under the harness with no `?ui=v1` gating relevant (component
  isn't imported there, period).

**A4 — `FloatingAltitudeDial`: `CONFIRMED` renders on both `/home` and `/navigator`, at
`126f7c4`.** `home.tsx` wraps its content in `CompanionShell`, whose entire body today is
literally `return <AppShell variant="transparent">{children}</AppShell>` — its own comment says
*"This used to be a parallel implementation of AppShell... now AppShell's transparent variant"*
(`CompanionShell.tsx:7-14`), i.e. this is the "AppShell routing fix" the brief references.
`AppShell.tsx:295` renders `<FloatingAltitudeDial />` unconditionally, once, for every route using
`AppShell` (both variants). Live: screenshot of `/home` shows the "Cruise | Working" pill
bottom-right; DOM query `[data-testid="altitude-dial"]` → 1 on both `/home` and `/navigator`.
Writes confirmed to `localStorage` key `nox-founder-altitude`
(`src/store/altitudeStore.ts:18`, Zustand `persist`), and that literal string is present in the
shared `index-*.js` chunk served by production. **Commit hash for this state: `126f7c4`.**

**A5 — theme control reachability: `DIFFERENT` from the brief's premise, on two counts.**
1. `ProjectEntryScreen.tsx` (with the explicit "Xcamp / Nox toggle — top-right",
   `ProjectEntryScreen.tsx:130-161`) is **not** a pre-login screen — it's rendered from
   `home.tsx:1118`, inside the authenticated `/home` route, shown when a logged-in user has no
   active project selected yet (`showEntry` state). `AppShell` redirects to `/auth` if there's no
   `user` at all, so this screen is unreachable without being logged in.
2. There is *also* a dedicated, always-reachable post-login control at **`/profile/appearance`**
   (`src/routes/profile.appearance.tsx`) labeled exactly **"Xcamp mode / Nox mode / System"** —
   confirmed live via screenshot (sidebar → Profile → Appearance).

Both controls ultimately drive the same mechanism: `useBrand()` (`src/lib/brand.ts:7-9`) derives
`isNox` directly from `resolved === "dark"` — i.e. **brand identity is not an independent setting
at all, it's a pure function of light/dark mode.** There is no in-app control that is Xcamp/Nox
*only* — every "theme" control found is a light/dark/system picker whose dark state happens to be
reskinned as "Nox."

---

## Part B — Persona seams

### 1. Welcome modal (`EcoIntroOverlay`, `src/components/ExperimentalHome.tsx:131-235`)
- **(a)** File/lines: `ExperimentalHome.tsx:125-235` (component + its static `LINES` array).
  Mounted from `EcosystemHomeView` at `ExperimentalHome.tsx:1209-1211`, shown once per
  `sessionStorage` key `INTRO_KEY` (`showOverlay` state, `:1058-1066`).
- **(b)** Cleanest persona-branch boundary: the `INTRO_LINES_STATIC` array itself
  (`:125-129`, currently `["I am your companion, always at your service.", "Your project is
  ready. Are you?", "Tap the orb to get started."]`) — swap for a `LINES = personaLines[persona]`
  lookup at `:133`. No structural change needed, it's already a plain array consumed by a
  `.map()`.
- **(c)** Greeting copy (`greetText`/`sublineText`, `:1200-1203`, and the TTS narration strings
  duplicated at `:1093-1101`/`:1129-1137`/`:1177-1181`) is **computed**, not config — a template
  literal built from `timeGreeting()`, `firstName(authUser)`, and `projects.length`. `authUser`
  comes from `useAuth()`. **Project tiles** (`:1266-1274`) come straight from the `projects` prop
  — `home.tsx` sources this via `listProjectsFull(authUser)` (`src/lib/xcamp-api.ts`), a live
  Supabase query, not the overlay's own concern.
- **(d)** The "Here's what I recommend" cards (`:1293-1312`) are **hardcoded JSX**, three
  `<RecommendCard>` literals (Daily journal / Quick note / Start a project) — not an array. A
  persona filter here means either wrapping each card in a conditional or refactoring to a config
  array first.

### 2. Nav rail (`AppSidebarExperimental.tsx`)
- Two **static arrays**, `ECOSYSTEM_NAV` (`:72-78`, 5 items) and `PROJECT_NAV` (`:80-87`, 6
  items), each a plain `NavItem[]` literal — no computation, no conditionals inside them today.
- Selection: `const navItems = navMode === "project" ? PROJECT_NAV : ECOSYSTEM_NAV;` (`:160`) —
  **this is the cleanest injection point** for per-persona item lists/visibility: e.g.
  `navItems.filter(item => isVisibleForPersona(item, persona))` right after this line, or make the
  two arrays themselves persona-parameterized functions.
- Current labelling confirmed as-is per instruction: `PROJECT_NAV` uses `label: "Logbook"`
  (`:83`) — not "Journal" — left untouched.

### 3. Ecosystem Home (`EcosystemHomeView`, `ExperimentalHome.tsx:1053-1317`)
- Project row: `:1266-1274`, same `projects` prop as the welcome modal (shared data source, not
  a separate fetch).
- "Here's what I recommend" tool-card set: `:1293-1312` — same hardcoded 3-card JSX block
  described above (this view *is* what renders the overlay's sibling content once dismissed; the
  overlay and the underlying view share the exact same recommend-card block, they are not two
  separate definitions).

### 4. Project Home (`ProjectHomeView`, `ExperimentalHome.tsx:1321-1530`)
- Welcome line under heading: `headingText`/`sublineText` (`:1436-1437`), computed from
  `activeProject.name` + `detailMetrics` (goals/total-tasks/open-tasks).
- **Goal/task counts are already available** — `detailMetrics` state (`:1339-1361`) comes from
  `fetchProjectDetailMetrics(authUser, activeProject.id)`, a real query already firing on this
  surface (confirmed live: screenshot shows "You have 1 goal, 1 task in total, 1 task currently
  open" against seeded fixture data). **No new query needed** for a persona view that also wants
  these numbers.
- "Tools" row: `:1492-1496`, **hardcoded JSX**, 3 `<ToolTile>` literals (Project Journal / New
  Note / Project Navigator) — not an array.
- "Suggested next steps" row: `:1499-1525` — **not implemented**. It's a static dashed-border
  placeholder box reading "Backcaster-generated suggestions — coming soon." There is no data
  behind it yet at all, persona-aware or otherwise. Confirmed live in the same screenshot (visible
  at the bottom, cut off).

### 5. Portfolio (`src/features/portfolio/PortfolioView.tsx`, `ProjectStubPanel.tsx`)
**`DIFFERENT` from the brief's premise** — the tab list is not what's assumed. Actual
`ProjectTab` union (`:14`, labels at `:24-29`): **`all | owned | collaborations | viewer`** →
"All", "Owned by me", "Collaborations", "Viewer". **There is no "Watchlist" tab and no "My
Collaborations" tab** (it's "Collaborations", no "My"). This lines up with Part C3 below: there is
no watchlist table in the database either — the brief's assumed 5-tab list doesn't exist in
either layer.

Separately, and not mentioned in the brief at all: there's a *second*, orthogonal tab dimension,
`AudienceTab = "overview" | "marketplace" | "investor"` (`:13`, rendered `:216-255`) — a
segmented control above the project tab bar. "Marketplace" and "Investor" are already in the UI,
already labeled, and already **`disabled` with a "SOON" badge** (`:221`, `:241-253`) — i.e. an
Investor-facing surface is already stubbed here, same "mock, not wired" pattern as
`CompanionRail`'s Role/Mood panels.

- Slide-in side panel: `ProjectStubPanel.tsx`, a shadcn `<Sheet>` (`:245-246`).
- Primary action button: `:213-243`, a single hardcoded `<Link to="/project/$projectId">`
  labeled **"Open project"** — **one component, one fixed label, not variable per tab.** Every
  project in every tab (owned, collaborations, viewer) gets the identical CTA today; there is no
  per-role branching to hook into yet, it would need to be added.

### 6. AI / Chi — request context assembly
**`DIFFERENT` from the brief's premise in two ways: the two "separate" call sites don't exist as
described, and the client function the brief likely means is dead code.**

- `src/lib/journal-api.ts:138-160` exports an `answerWithContext()` function that POSTs to
  `/api/answer-with-context` — but `grep -rn "answerWithContext(" src` outside its own definition
  returns **zero results**. It is unused. **The frontend's actual companion send flow is
  `src/hooks/useVox.ts`** (`call()`, POSTs to the same `/api/answer-with-context` path via
  `voxFetch`), invoked from **one single call site**: `src/routes/home.tsx:650-657`, inside
  `handleSend`. There are not two separate assembly sites for ecosystem vs. project scope — it's
  the *same* call, differentiated only by whether `project_id` is set:
  ```ts
  const res = await vox.call({
    message: text,
    project_id: activeProject?.id || undefined,   // undefined = ecosystem scope, set = project scope
    objective_id: "",
    tenant_id: authUser!.tenantId,
    altitude,
    aiPersona: "guide",
  });
  ```
- **A `persona` field already exists in this exact payload, right now, hardcoded to the literal
  string `"guide"`** (`home.tsx:656`). This is the exact site to change — not add a new field,
  replace this literal with a real value.
- End-to-end wiring for that field already exists server-side too: `xcamp-backend`'s route
  (`src/routes/answer-with-context.routes.ts:17-30`) destructures `aiPersona` from the request
  body and threads it straight through to `VoxIntegrationService.answerWithContext()`
  (`src/services/vox-integration.service.ts:335-403`), which folds it into the system prompt as
  `Persona: ${aiPersona}. Adapt tone accordingly...` (`:403-405`). **The backend already fully
  supports a persona field it is not currently being asked to vary.**

- **Which lane actually serves this today — confirmed via live network trace + source, not code
  reading alone:**
  ```
  $ curl -X POST https://xcampapi.xchange.eco/api/answer-with-context -d '{"message":"test"}'
  {"error":"Unauthorized"}          # HTTP 401 — route exists and is live at this host
  ```
  `.env.example`: `VITE_VOX_API_URL=https://xcampapi.xchange.eco`,
  `VITE_BACKEND_URL=https://xcampapi.xchange.eco` — same host for both. **The browser only ever
  talks to `xcamp-backend`** (`xcampapi.xchange.eco`) for this feature; it never contacts
  `chi-orchestration` directly, and `chi-orchestration`'s own `src/server.ts` confirms this by
  design — its `/api/search` and `/api/generate` routes are commented *"called server-to-server
  from xcamp-backend"* / *"S2S trusted path; no caller JWT"* (`chi-orchestration/src/server.ts:67-91`).
  Server-to-server, so it does not show up in a browser network trace by definition — this part
  is necessarily sourced from `chi-orchestration`'s own code, not observable client-side.

  The actual division of labor, read from `xcamp-backend/src/services/vox-integration.service.ts`:
  1. **Context retrieval** (`voxVectorSearch`, `:2780-2812`) — `xcamp-backend` calls
     `${chiOrchestrationUrl}/api/search` (chi-orchestration), for semantic/RAG context only, with
     a Supabase full-text-search fallback if that call fails.
  2. **The actual chat completion** (`answerWithContext`, step 4, `:457-464`) — `xcamp-backend`
     calls `https://api.openai.com/v1/chat/completions` **directly**, using its own
     `OPENAI_API_KEY`. `chi-orchestration` is not involved in generating the reply at all for this
     endpoint (its `/api/generate` endpoint is a separate WS1 code path, used elsewhere via
     `ChiAiAdapter`/`GenerationPort`, not by `answerWithContext`).

  **So: neither "answer" in the brief's either/or framing is complete on its own.** It's
  `xcamp-backend` → OpenAI directly for generation, with a server-to-server side-call to
  `chi-orchestration` for retrieval only.

---

## Part C — Data reality check

Project `ueebzuleyrnsrxbowdfa`, dev tenant `30a00e60-7cae-4a5e-a311-b3be998e7113`. All queries
read-only via `execute_sql`.

### C1 — persona/mode/plan attribute anywhere on `central_users`, `user_preferences`,
`tenant_memberships`, or `profiles`?
```
central_users:      id, email, created_at, updated_at, preferences (jsonb), tenant_id,
                     display_name, auth_uid
user_preferences:    user_id, theme_mode, accent_hsl, gradient_from_hsl, gradient_to_hsl,
                     language, updated_at, altitude, skin_config (jsonb), theme_config (jsonb)
tenant_memberships:  id, tenant_id, user_id, role, invited_at, joined_at, left_at,
                     metadata (jsonb), status
profiles:            [] — table does not exist
```
**Read:** No dedicated `persona` / `mode` / `plan` column anywhere. `theme_mode` is UI light/dark,
`user_preferences.altitude` is the strategic/tactical/operational dial (unrelated to persona).
Two `jsonb` columns exist that *could* carry an ad-hoc persona value without a migration
(`central_users.preferences`, `tenant_memberships.metadata`), but nothing reads a persona key from
them today (not grepped in either app repo).

### C2 — `object_memberships.role` and `collaborators.role` actual values, dev tenant
(note: the brief calls the second column `collab_role`; it doesn't exist — the actual column is
`role`, confirmed via `information_schema.columns`)
```
object_memberships (role is a Postgres enum column):
  note / owner / active           217
  organization / viewer / active    6
  project / owner / active          3
  workspace / owner / active        1
  organization / owner / active     1

collaborators (role is text):
  note / creator / active         187
  objective / creator / active     55
  task / creator / active          30
  init / creator / active          12
  project / creator / active        3
  objective / viewer / active       1
  objective / editor / active       1
```
**Read:** These are two different tables with two different role vocabularies for what's
conceptually the same relationship — `object_memberships` uses `owner`/`viewer` (no `editor`
observed in this tenant, though the column is `USER-DEFINED`/enum so it may allow more),
`collaborators` uses `creator`/`viewer`/`editor` (no `owner` at all — `creator` is the
ownership-equivalent role here). Any persona logic keyed off "is this user an owner" needs to
know which table it's asking, and the two tables can disagree (see C4).

### C3 — watchlist / following / investor-interest table?
```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema='public' AND (table_name ILIKE '%watch%' OR table_name ILIKE '%follow%'
  OR table_name ILIKE '%interest%' OR table_name ILIKE '%investor%');
→ []
```
**Read: does not exist.** Confirmed against the full 100-table `public` schema listing (pulled
separately, not shown in full here for length) — no watchlist/follow/investor-interest table by
any name. No schema is proposed here, per the out-of-scope instruction. This is consistent with
Part B5: the Portfolio UI has no "Watchlist" tab either, and its "Investor" audience toggle is
`disabled`/"SOON".

### C4 — dev super-admin (`ce8bbd89-dea9-4ae2-b6c4-2b9ca15b064f`): owned vs. non-owner project
memberships
```
projects.owner_central_id = user:                                    10 owned
object_memberships (object_type='project', role<>'owner', this user): 0 rows
collaborators (object_type='project', role<>'creator', this user):    0 rows
object_memberships (object_type='project', role='owner', this user):  3 rows  ← not 10
```
**Read:** This user owns 10 projects but holds **zero non-owner project memberships** by either
table — the collaborator persona has **no real data to render for this user today; it needs
seeding** to be demoable. Flagging a side-finding, not asked for but relevant to anyone building
on this data: only 3 of the 10 owned projects have *any* `object_memberships` row at all (even an
`owner` one) — a 7-project gap between `projects.owner_central_id` and `object_memberships`
backfill for this user. Worth knowing before trusting `object_memberships` as a complete source of
truth for "which projects does X have access to."

---

## Summary — everything tagged `UNCLEAR — NEEDS HUMAN INPUT`

1. **A2** — whether `CompanionRail` being demoted to `?ui=v1`-only (as collateral of PR #94's
   default-UI flip, not a deliberate decision about the rail itself) was intended to be permanent,
   or whether the rail should be revived against the new `EcosystemHomeView`/`ProjectHomeView`,
   rebuilt, or deleted outright. No commit discusses the rail's fate specifically.
2. Everything else in this report resolved to `CONFIRMED`, `GONE`, or `DIFFERENT` with direct
   source and/or live evidence — no other open unknowns.

## Corrections to this brief's own premises (per standing rule 6)

- **A1/A2**: the rail is not gone; it's gated behind `?ui=v1`, and the array is named `RAIL_ITEMS`
  not `RAIL_ICONS` (that name has never existed in this repo's history).
- **A5**: the Xcamp/Nox toggle is not pre-login-only — `ProjectEntryScreen` is post-login, and a
  second, persistent post-login toggle exists at `/profile/appearance`. Also: there is no
  independent Xcamp/Nox setting at all — it's a pure function of light/dark mode.
- **B5**: Portfolio's tabs are `All / Owned by me / Collaborations / Viewer` (4, not 5) — no
  "Watchlist" tab, no "My Collaborations" (it's "Collaborations").
- **B6**: there aren't two separate ecosystem/project context-assembly sites — one call site
  handles both, branching only on whether `project_id` is set. And the client-side
  `answerWithContext()` the brief's phrasing points at (`journal-api.ts`) is dead code; the real
  path is `useVox()` from `home.tsx`. Neither "xcamp-backend direct" nor "chi-orchestration" alone
  is the right answer to "which lane serves this" — it's xcamp-backend for generation (direct
  OpenAI call) with a server-to-server side-call to chi-orchestration for retrieval only.
