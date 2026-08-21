# Welcome Screen Duplication Diagnosis + Layout/Wrapper Audit
**Date:** 2026-08-17
**Type:** Part A — diagnosis + narrow fix (applied). Part B — read-only layout inventory (no changes).
**Verification method:** See note below — Vercel preview access is blocked in this environment; live evidence comes from a local `vite dev` server driven by real Chromium (Playwright) with an authenticated session and stubbed Supabase/Vox network calls, not from reading source and assuming.

## Method note: Vercel preview is blocked in this environment

The brief requires live click-through on a Vercel preview in a fresh private window. PR #99 (open on this repo, `claude/pr-95-regressions-audit-qkifxt`) already hit and documented this exact blocker: the preview for a branch on this repo sits behind Vercel SSO deployment protection (`302 → vercel.com/sso-api`), which this session cannot authenticate through. That is `BLOCKED`, not worked around silently.

What was done instead, for every claim below: a real Chromium instance (Playwright, the same engine Vercel's build would render with) driven against a local `vite dev` server on this branch, with a stubbed-but-real Supabase auth session (`sb-<project-ref>-auth-token` seeded in `localStorage`, matching how `@supabase/supabase-js` actually reads its session) and stubbed REST/auth endpoints so the real component tree renders and runs its real effects — not a mock of the UI. Every finding is a live screenshot or live DOM/text probe, not a description of expected behavior. Someone with Vercel access should re-run the same click-through on the actual preview before merge; this is flagged, not hidden.

---

## Part A — Welcome screen duplication bug

### Root cause — `CONFIRMED`

The duplication is **not** in `ProjectEntryScreen.tsx`, and **not** related to the `?ui=v1` / `sessionStorage['xcamp-ui-version']` sticky flag from PR #94. It reproduces in a genuinely fresh session (no `?ui=v1` ever visited, `sessionStorage` cleared) with zero legacy-mode involvement.

It lives entirely in `src/components/ExperimentalHome.tsx`, inside `EcosystemHomeView` — the screen you land on after `ProjectEntryScreen` → "Enter the ecosystem instead.":

- `EcoIntroOverlay` (`src/components/ExperimentalHome.tsx:115-219`, added 2026-08-03 in commit `6900cf7` "feat(ecosystem-home): add first-launch intro overlay with audio unlock") is a full-screen "curtain" shown once per session (gated by `sessionStorage['eco-home-intro-seen']`, line 1037). Before the fix, its typed line sequence was `[greetLine, ...INTRO_LINES_STATIC]` (line 117), where `greetLine` = `` `${timeGreeting()}, ${firstName(authUser)}.` `` (e.g. *"Good morning, Audit."*) passed in from the parent at line 1187 (previously `greetLine={greetText}`).
- Once the curtain is dismissed, the **hero page underneath** (already mounted, just faded to `opacity: 0`) runs its own narration effect (`src/components/ExperimentalHome.tsx:1091-1139`), which types out the **exact same string** — `greetText` at line 1177, rendered via a second, independent `<Typewriter>` at line 1202 — as phase 1 of its own reveal, this time with audio (`speak(TEXT1)`, line 1117).

So the sequence a user actually saw was: type "Good morning, Audit." once (silent, in the overlay) → tap the orb to dismiss → the hero re-types "Good morning, Audit." a second time (this time spoken aloud) a few hundred milliseconds later. Two welcome/greeting moments, back to back, saying the identical thing — this is the "old and new welcome screen" duplication reported.

**Why "old vs. new":** git history shows `EcoIntroOverlay` (Aug 3) predates `ProjectEntryScreen` becoming the app's front door (`ProjectEntryScreen` added Aug 9, commit `f415478`; flipped to default Aug 9, commit `346f035`; redesigned Aug 10, commits `bc9d224`/`7208e41`). When `ProjectEntryScreen` was introduced as the new "Welcome to Xcamp" gate, the pre-existing first-launch greeting inside `EcosystemHomeView` was never reconciled with it — a user now passes through `ProjectEntryScreen`'s welcome, then one click later hits the older, un-updated "first launch" welcome/greeting flow underneath, which itself internally repeats its own greeting.

**Confirmed NOT the same as the already-deferred `ProjectEntryScreen.tsx` bugs.** `ProjectEntryScreen.tsx` was not touched by this diagnosis or fix — it is a separate file with no shared code path with `EcosystemHomeView`/`EcoIntroOverlay`. The wrong-logo/hardcoded-hex/fixed-grid items stay deferred exactly as instructed.

**Live evidence (Chromium, fresh session, no `?ui=v1`, `sessionStorage` cleared):**
1. Land on `/home` → `ProjectEntryScreen` renders, "Welcome to Xcamp." — single, clean render, confirmed via screenshot and DOM probe (`hasWelcomeHeading: true`, no legacy greeting present).
2. Click "Enter the ecosystem instead." → `EcoIntroOverlay` appears (`position: fixed; inset: 0; z-index: 45`) and types, before the fix: *"Good morning, Audit."* / *"I am your companion, always at your service."* / *"Your project is ready. Are you?"* / *"Tap the orb to get started."* — confirmed by screenshot.
3. Tap the orb → curtain fades out (0.45s) → hero underneath reveals and re-types *"Good morning, Audit."* again as its own phase-1 heading, before fading in the input box — confirmed by screenshot and `innerText` probe showing the greeting text present twice across the two steps, once in the overlay, once again in the hero.

### Is it narrow, or does it touch shared layout? — narrow

This is isolated entirely to `EcosystemHomeView`/`EcoIntroOverlay` inside one file (`ExperimentalHome.tsx`), used only by the "ecosystem" nav-mode home view. It does not touch `CompanionShell`/`AppShell`, `AppSidebar*`, `ItemSidepanel`, or any component shared across more than this one view. `ProjectHomeView` (the "project" nav-mode sibling in the same file) has its own separate, un-duplicated narration sequence and was not touched. Per the brief's exception clause, this qualifies for a same-pass narrow fix.

### Fix — `FIXED`

`src/components/ExperimentalHome.tsx`:
- `EcoIntroOverlay` no longer takes a `greetLine` prop or types the personalized greeting; its `LINES` are now just the three static companion/service lines (`"I am your companion, always at your service."` / `"Your project is ready. Are you?"` / `"Tap the orb to get started."`). Comment added explaining why the greeting was removed from this component specifically.
- The two-stage visual grouping (a gap between line 1 and lines 2–3) was preserved by moving the `margin-top` breakpoint from index 2 to index 1 to match the new 3-line array.
- The call site (`<EcoIntroOverlay onDismiss={handleOverlayDismiss} />`, line 1189) no longer passes `greetLine`.
- The hero's own greeting (`greetText`, still used at lines 1177/1202) is untouched — it remains the single place the personalized, audio-narrated greeting is delivered.

**Verification — live, after fix, same Chromium harness:**
- Overlay now types only: *"I am your companion, always at your service."* / *"Your project is ready. Are you?"* / *"Tap the orb to get started."* — confirmed via screenshot.
- After dismissing, the hero types *"Good morning, Audit."* **exactly once** — confirmed via screenshot and `innerText` probe (string present once across the full before→after sequence, versus twice before the fix).
- `npx tsc --noEmit`: 18 pre-existing errors, unchanged, none in the touched file (same baseline PR #99 documented on this repo).
- `npx eslint src/components/ExperimentalHome.tsx`: 80 pre-existing prettier-formatting findings, identical count before and after this change (all pre-existing in the file, none introduced or removed by this diff).

No other route, no shared shell, and no other view in this file were modified.

---

## Part B — Layout/Wrapper component audit (read-only, no changes applied)

### Inventory

| Screen | Layout file(s) | Matches variant (1/2/3/none) | Shared component or reimplemented? | Container/Sidepanel drift | Nav wrapper usage |
|---|---|---|---|---|---|
| **Companion — legacy chat** (`isLegacy` path, reachable only via the sticky `?ui=v1` flag) | `src/routes/home.tsx:152-718` | **1** — fullscreen bg image + container, but the image is applied by mutating `document.documentElement.style.cssText` directly (lines 159-170), not an `<img>` tag like every other screen uses | Reimplemented entirely inline; no Shell/Layout/Container import | Glass panel: `var(--glass-*)` tokens, `blur(18px)` via `var(--glass-blur, 18px)` — its own separate token family from `--skin-*` used everywhere else. Nav-pill bar and `TopChrome` buttons: `blur(8px)`. `EntityPanel` back-button chip: `blur(12px)`, hardcoded rgba fallback. TTS error banner: fully hardcoded rgba, no tokens at all (`home.tsx:742-745`) | `CompanionShell` — missing `RightPanelProvider`/`FloatingAltitudeDial`/`TaskFullscreenModal` that all `AppShell`-based routes get (see "Nav wrapper" note below) |
| **Companion — EcosystemHomeView** (ecosystem nav-mode home) | `src/components/ExperimentalHome.tsx:556-650` (`EcosystemHeroLayout`), `1030-1296` | **2-ish** — top image fade to color + card, but a hand-rolled fork of `PageHeroShell` (see duplication #1 below), not the shared component | Reimplemented — `PageHeroShell` exists and is imported in this very file (for `ProjectHomeView`) but not reused here | Opaque `var(--skin-bg)` card, **no blur at all** — while one nav-mode over (legacy chat) uses an 18px-blur glass panel for conceptually the same "home" surface. `EcoIntroOverlay` (Part A) is a flat `var(--skin-bg)` full-bleed curtain | `CompanionShell` |
| **Companion — ProjectHomeView** (project nav-mode home) | `src/components/ExperimentalHome.tsx:1298-1512` | **2** — top image fade to color + card | **Shared** — imports and uses `PageHeroShell` directly, passing `image={activeProject?.feature_image}` | Same `PageHeroShell` container: token-based, no blur | `CompanionShell` |
| **Companion — ExperimentalChatView** (chat mode) | `src/components/ExperimentalHome.tsx:1514-1625` | **3-ish** — bare, flat `var(--skin-surface)`, no image, no card, but with its own header/footer bars (Navigator's variant-3 has none) | Reimplemented inline | No container | `CompanionShell` |
| **Companion — ProjectEntryScreen** (entry/welcome gate) | `src/components/ProjectEntryScreen.tsx` (531 lines) | **A 4th, unnamed variant**: fullscreen bg image + a centered frosted-glass **card** (not a top-fade hero, not a chat panel) | Reimplemented entirely inline; imports **no** shared layout component at all | 100% hardcoded — no `var(--...)` token anywhere for the card's background/border/blur. `blur(26px)`, the largest blur value in the app and used nowhere else. Base fill `#0f1c1f` hardcoded. `ORB_GRADIENT` hex pairs hardcoded. (Known-deferred visual bugs live here too — out of scope per the brief.) | `CompanionShell` — the sidebar is technically still mounted behind it, but this screen's `position: fixed; inset: 0; z-index: 50` overlay visually hides it entirely; nothing in the shell layer decided to hide nav for this route, the screen just paints over it |
| **Auth / pre-login "Welcome"** | `src/routes/auth.tsx` | **None** — standalone centered form, no hero image, no glass/blur card | Reimplemented inline (expected — this is the one screen that legitimately has no shell, since there's no authenticated user yet) | Flat `--skin-*` tokens only; no drift found | None, by design |
| **Logbook — My Journal** | `src/routes/journal.tsx:37-45` + `src/components/JournalFlow.tsx` | **2** | **Shared** — `AppShell` + `PageHeroShell` | `PageHeroShell` container: token-based, no blur. `JournalFlow` has a handful of hardcoded fallback colors (`#e0a23a`/`#b87814` status pill, `#22c55e`) | `AppShell` (full-featured) |
| **Logbook — New Journal Entry** | Same route/component — `screen === "input"` is an internal state branch inside `JournalFlow`, not a separate route/screen | Same (shares the one `PageHeroShell` mount) | Shared | Same | `AppShell` |
| **Logbook — My Notes** | `src/routes/notes.tsx:37-45` + `src/components/NotesBrowser.tsx` | **2** | **Shared** — `AppShell` + `PageHeroShell` | Same `PageHeroShell` container, plus `NotesBrowser`'s own hardcoded dropdown shadow `rgba(0,0,0,0.18)` (copy-pasted verbatim at two call sites) and a hardcoded `#fff` toggle-switch knob | `AppShell` |
| **Logbook — New Note** | Same route/component — `editing` is an internal state branch inside `NotesBrowser`, not a separate route/screen | Same | Shared | Same | `AppShell` |
| **Navigator** | `src/routes/navigator.tsx` + `src/components/navigator/**` | **3** — bare, no image, no container — matches the stated hypothesis exactly, confirmed by full file reads (no `<img>`, no `useHeroImage`, no card element anywhere) | **Shared** — `AppShell` only; correctly uses no container/hero primitive because this screen genuinely needs none | Nothing to drift in the (absent) container, but `NavigatorGraph`/`TaskPanel`/`ColumnToolbar` scatter their own hardcoded shadow rgba values; no blur anywhere in the subtree | `AppShell` |
| **Ecosystem Navigator** (placeholder "coming soon") | `src/routes/ecosystem-navigator.tsx` | **3** — bare, but an **independent reimplementation**, not shared code with `navigator.tsx` despite the similar name | Reimplemented (own small centered flex layout), though token-clean | None found | `AppShell` |
| **Objectives — quick panel** | `src/components/EntityPanel.tsx`, mounted by `AppShell`'s `RightPanelSlot` on most routes, or rendered bare by `CompanionShell`/`home.tsx` on `/home` | **None** — flat, unstyled content pane | Reimplemented; no hero/card chrome of its own | No blur, no rounding. Its *host* behavior is itself inconsistent: `AppShell` wraps it in a responsive `aside`/mobile-fullscreen `RightPanelSlot`; `CompanionShell` renders `ItemSidepanel` directly with none of that responsive/mobile handling | `AppShell` or `CompanionShell`, depending on route — different treatment in each |
| **Objectives — fullscreen (task view)** | `src/routes/task.$taskId.tsx` + `src/components/TaskFullscreenModal.tsx` | **None** — standalone flat full-page layout; does **not** use `AppShell` or `PageHeroShell` at all | Reimplemented entirely; also stacks **two** different side-panel-like elements at once (its own ad hoc "linked objectives" column, plus a separately-mounted `ItemSidepanel`) | Modal backdrop `rgba(0,0,0,0.10)` hardcoded, no blur; modal shell shadow hardcoded; side column alternates `var(--skin-surface2)`/`var(--skin-surface)` by altitude, unrelated to how `ItemSidepanel` styles itself two components over | Neither — its own top bar, no shared nav wrapper |
| **Portfolio** | `src/routes/portfolio.tsx` + `src/features/portfolio/PortfolioView.tsx` | **None** — flat, bordered-section layout; not variant 1, 2, or 3 — no hero image, no card at all | Reimplemented; `AppShell` only, `PageHeroShell` not used | Its own `--xr` / `--xr-lg` / `--xr-pill` radius-token vocabulary, not used anywhere else in the app. `ProjectStubPanel` sidepanel is a 5th distinct sidepanel implementation (radix `Sheet`, not `ItemSidepanel`) | `AppShell` |
| **Project Details** | `src/routes/project-details.tsx` | **2** | **Shared** — `AppShell` + `PageHeroShell` (explicit `image` prop, not seeded) | `blur(4px)` on the "Change image" button — a third, unique blur radius not matching any other screen; hardcoded `rgba(0,0,0,0.45)` button background | `AppShell` |
| **Project (single)** | `src/routes/project.$projectId.tsx` | **2** | **Shared** — `AppShell` + `PageHeroShell` (`seed={projectId}`, stable per project — a third distinct hero-selection strategy, see below) | Token-clean aside from one `var(--skin-danger, #d4524e)` fallback | `AppShell` |

**Nav wrapper note (`AppShell` vs. `CompanionShell`):** `src/components/CompanionShell.tsx` (105 lines) is a stripped-down parallel implementation of `src/components/AppShell.tsx` (263 lines) — same `SidebarStatePersist`/`MobileMenuButton`/`sidebarDefaultOpen`/loading-gate/`AppSidebarExperimental` vs. `AppSidebar` toggle logic, hand-copied — but missing `RightPanelProvider`, `FloatingAltitudeDial`, `TaskFullscreenModal`, and the resizable-sidebar-width behavior that all 11 other routes get through `AppShell`, and using `background: "transparent"` throughout instead of `AppShell`'s `var(--skin-surface)`. `/home` (all of Companion's sub-views above) is the **only** route using `CompanionShell` instead of `AppShell`.

### Duplication examples (file A and file B implementing the same pattern with different values)

1. **The "top hero image fading into a color background + overlapping card" pattern (variant 2) is reimplemented outside `PageHeroShell` instead of reusing it, with the fork's own in-code comment admitting it:**
   - Shared/canonical: `src/components/PageHeroShell.tsx:58-190`
   - Forked copy: `src/components/ExperimentalHome.tsx:556-650` (`EcosystemHeroLayout`) — its own comment at lines 557-558 says *"Mirrors PageHeroShell's structural pattern (hero banner + overlapping card) but adds an animated colour-shift overlay"*, and again at lines 591/619, *"same as PageHeroShell."*
   - The bottom fade-to-surface gradient is **byte-for-byte identical** between the two: `linear-gradient(to bottom, transparent 0%, color-mix(in srgb, var(--skin-surface) 55%, transparent) 55%, var(--skin-surface) 100%)` at `PageHeroShell.tsx:118-122` and `ExperimentalHome.tsx:620-627`.
   - But the two diverge everywhere else they didn't have to: hero heights (`h-[150px] sm:h-[280px] md:h-[320px]` vs. `h-[300px] sm:h-[560px] md:h-[640px]`), overlap offset (a single numeric `overlap` prop, default 56, vs. hardcoded per-breakpoint `-mt-[230px] sm:-mt-[440px] md:-mt-[500px]`), and — most importantly — whether the accent-tint overlay is token-driven: `PageHeroShell.tsx:90-114` hardcodes two rgba teal gradients (flagged in its own "OPEN DECISION" comment as an unresolved dark-mode issue) while `EcosystemHeroLayout` instead builds an *animated* gradient from `color-mix()` and `--skin-accent` (`ExperimentalHome.tsx:600-617`) — the two hero implementations don't even agree on whether hero tinting should be hardcoded or token-based.
   - `PageHeroShell` already exposes `heroHeightClass`/`overlap`/`overlapClass` props for exactly this kind of per-screen variation — the fork didn't need to happen.

2. **The Companion glass panel exists as four separate implementations with four different blur radii**, all conceptually "the same" translucent chat panel:
   - `src/routes/home.tsx:700-718` — `blur(var(--glass-blur, 18px))`, token-driven
   - `src/components/companion/CompanionGlassPanelV2.tsx:128-144` — `blur(20px)`, token-driven, but **dead code** (zero import references anywhere in `src/`, confirmed by repo-wide search; its own header comment calls itself a "structural fork" activated by a flag that no longer wires to anything)
   - `src/routes/home.tsx:1109-1124` (`EntityPanel` back-button chip) — `blur(12px)`, token-with-hardcoded-fallback
   - `src/components/ProjectEntryScreen.tsx:173-189` — `blur(26px)`, fully hardcoded rgba, no tokens at all

3. **`backdrop-filter` blur values are scattered with no shared token anywhere in the app** — seven different literal radii found: 4px (`project-details.tsx:320`), 8px (at least six separate call sites: `AppShell.tsx:42-43`, `ProjectEntryScreen.tsx:144-145`, `ExperimentalHome.tsx:544-545`, `CompanionShell.tsx:25-26`, several in `home.tsx`), 12px (`home.tsx:1123`), 18px (`MentionMenu.tsx:101-102`, `home.tsx:713-714`), 20px (`CompanionGlassPanelV2.tsx:141-142`, dead code), 26px (`ProjectEntryScreen.tsx:182-183`). Only one call site (`home.tsx:713-714`, via `var(--glass-blur, 18px)`) references a CSS custom property at all — every other occurrence is a bare numeric literal picked independently per screen.

4. **The "slide-out side panel" pattern has five independent implementations**, only two of which share code with each other:
   - `ItemSidepanel.tsx` (flat in-layout `aside`, no scrim, no blur) — used by Journal/Notes/Task via `AppShell`'s `RightPanelSlot`, or bare via `CompanionShell`
   - `EntityPanel.tsx` — same flat `aside` host, no chrome of its own
   - `OrganiseSheet.tsx` + `ProjectStubPanel.tsx` — both built on the shared radix `Sheet` primitive (`bg-black/80` scrim, slide-in from right) — these two *are* consistent with each other, but structurally disjoint from `ItemSidepanel`/`EntityPanel`
   - `TaskFullscreenModal.tsx` — a fifth, one-off `position: fixed; inset: 16` dialog with its own `rgba(0,0,0,0.10)` scrim and `border-radius: 12`
   - `CompanionRail.tsx` (Companion's right-edge Role/Mood/Detail rail) and `navigator/TaskPanel.tsx` independently converge on the same *recipe* (flat `--skin-surface` + hardcoded box-shadow, no blur) without sharing any code — `boxShadow: "-8px 0 32px rgba(0,0,0,0.18)"` vs. `"-4px 0 24px rgba(0,0,0,0.12)"`

5. **Three different hero-image *selection* strategies across `PageHeroShell` consumers**, all valid uses of the component's existing props but never reconciled: Journal/Notes pass neither `seed` nor `image` → unseeded random image on every mount; `project.$projectId.tsx` passes `seed={projectId}` → stable per project; `project-details.tsx` passes an explicit `image={featureImage}` → deterministic from data. Not a code duplication, but a behavioral inconsistency worth resolving alongside any taxonomy work.

### Container/Sidepanel styling drift examples (tokens vs. hardcoded, blur/opacity mismatches)

- `ProjectEntryScreen.tsx:173-189` — the entry screen's entire "frosted glass card" is hardcoded (`rgba(255,255,255,0.34)` background, `rgba(255,255,255,0.45)` border, `blur(26px)`) with **zero** references to `--glass-*` or `--skin-*` tokens, unlike every other glass/card surface in the app.
- `ProjectEntryScreen.tsx:65-78` — base fill `background: "#0f1c1f"`, a hardcoded hex with no token.
- `ProjectEntryScreen.tsx:10-13` — `ORB_GRADIENT` brand colors hardcoded per theme (`#1d9e8f`→`#1f5fae` xcamp, `#5a5ae0`→`#3fb6c9` nox) instead of referencing `--skin-accent`/`--skin-accent-gradient`.
- `src/routes/home.tsx:742-745` — TTS error banner: `border: "1px solid rgba(239,68,68,0.4)"`, `background: "rgba(239,68,68,0.1)"`, `color: "rgba(239,68,68,0.9)"` — no token at all, where `var(--skin-danger, ...)` (used with a fallback everywhere else in the app) would be expected.
- `src/components/NotesBrowser.tsx:410` and `:472` — `boxShadow: "0 8px 24px rgba(0,0,0,0.18)"` copy-pasted verbatim at two call sites in the same file rather than centralized.
- `src/routes/project-details.tsx:320` — `backdropFilter: featureImage ? "blur(4px)" : "none"`, a blur radius that appears nowhere else in the codebase.
- `src/components/ExperimentalHome.tsx:1177-1207` (Companion/Ecosystem) uses `--skin-*` tokens for its card, while `src/routes/home.tsx:700-718` (Companion/legacy, same route) uses a completely separate `--glass-*` token family — two different design languages coexist under the same `/home` route depending on which sub-view is active.
- `src/components/sidepanel/ItemSidepanel.tsx:829-838` — the shared, most-reused sidepanel is a flat `var(--skin-surface)` panel with **no glass/blur treatment whatsoever**, in contrast to the human's stated intent that Container/Sidepanel should "always use the same color tokens, glass-optic treatment." As implemented today, glass-optic exists only on Companion's legacy chat panel and (hardcoded) on the entry screen — the actual shared sidepanel used almost everywhere else in the app has no glass treatment to converge on.
- `src/components/navigator/NavigatorGraph.tsx` — hardcoded `#22c55e` (used 3×), `#fff` (2×), and three distinct hardcoded box-shadow rgba values, in an otherwise fully token-based navigator subtree.
- `--skin-accent-faint` token used with the identical hardcoded rgba fallback in two unrelated files (`src/routes/navigator.tsx:102` and `src/components/navigator/NavigatorGraph.tsx:568`, both `rgba(78,193,211,0.1)`) — suggesting the token itself may not always be defined and everyone independently discovered the same workaround value.

### Proposed naming taxonomy (for approval — not implemented)

Adjusting the brief's starting point slightly based on what actually exists in the codebase today:

- **`AppShell`** — already exists and is already the correct, full-featured Nav wrapper (sidebar show/hide, right-panel slot, altitude dial, fullscreen task modal). Recommend **`CompanionShell` be retired in favor of `AppShell`** (with a `transparent`/`fullBleed` variant prop to preserve `/home`'s see-through-to-hero-background behavior and its starts-collapsed sidebar default) rather than inventing a new name — this closes the Nav-wrapper gap identified above without adding a second shell concept for the human to keep in sync.
- **`FadeImageLayout`** — variant 2. Already exists as `PageHeroShell`; recommend keeping that name (it's accurate and already has callers) rather than renaming, and instead **retiring `EcosystemHeroLayout`** by parameterizing `PageHeroShell` to cover its one genuinely new need (the animated color-shift overlay) via a prop, e.g. `PageHeroShell({ animatedOverlay?: boolean })`.
- **`BareLayout`** — variant 3 (Navigator-style: no bg, no container). Does not exist yet; Navigator, Ecosystem Navigator (placeholder), Portfolio, and `ExperimentalChatView` would all become callers if it did.
- **`FullscreenImageLayout`** — variant 1 (Companion legacy-style: fullscreen bg image + glass container). Only one real consumer today (the legacy chat path, itself reachable only through the sticky `?ui=v1` flag) plus `ProjectEntryScreen`'s "4th variant" is close-but-not-identical (centered card, not a chat panel docked to one side) — see feasibility note below before assuming this is a two-line rename.
- **`GlassContainer`** — does not exist as a shared component at all today; every "glass" surface (legacy chat panel, `CompanionGlassPanelV2` (dead), `ProjectEntryScreen`'s card, various pill buttons) hand-rolls its own `background`/`border`/`backdrop-filter` combination. This is the single highest-leverage primitive to build, since it would immediately resolve duplication examples #2 and #3 above.
- **`GlassSidepanel`** — recommend **not** introducing this as a new concept until it's decided whether the app's *actual* shared sidepanel (`ItemSidepanel`) should gain glass-optic styling, or whether glass-optic is meant to stay Companion-specific chrome. As built today, `ItemSidepanel` (the one genuinely shared, most-reused sidepanel) has no glass treatment — naming a `GlassSidepanel` primitive before that product decision is made risks the name shipping ahead of the thing it's supposed to describe.

### Feasibility note: could Auth/Welcome be rebuilt on Companion's variant-1 layout with no new component?

**No, not without extracting Companion-specific assumptions out of variant 1 first.** Companion's variant-1 implementation (`src/routes/home.tsx:640-1011`, legacy path) has several things baked in that a "Welcome"/entry screen doesn't want and would have to actively opt back out of:

- The background image is applied by mutating `document.documentElement.style.cssText` on the real `<html>` element (`home.tsx:159-170`), a page-global side effect with its own cleanup-on-unmount logic — not a self-contained layout prop.
- The "container" is docked to one side of a `CompanionRail`-aware flex row (`right: railPanelWidth` at `home.tsx:666`) and is chat-shaped (scrollable message thread + fixed input footer at the bottom) — structurally a chat panel, not a generic content card. `ProjectEntryScreen`'s actual layout need (a centered card over a fullscreen image, no side rail, no chat thread) is a different shape than what variant 1 currently provides, even though both are "fullscreen image + container" at a glance.
- Variant 1 is only reachable through the sticky legacy-mode flag today, so it is arguably the least battle-tested/most likely-to-be-deleted of the three named variants — building a new front door on top of code that may itself be slated for removal is a real risk worth flagging before committing to it.

If Auth/Welcome is rebuilt on a shared fullscreen-image-layout primitive, that primitive should most likely be extracted fresh from what `ProjectEntryScreen` already does well (fullscreen image + centered glass card, no side rail, no chat semantics) rather than from Companion's variant 1 — with Companion's chat-specific docking/rail behavior layered on top as its own concern, not baked into the base layout. That's a design call for the human, surfaced here per the brief's request — not implemented in this pass.

---

## Post-merge re-verification (Part C of the 2026-08-17 deployment-verification pass)

**Context:** this audit's own branch (`claude/welcome-duplication-diagnosis-1w6u05`, PR #100) was cut before PR #99 (`claude/pr-95-regressions-audit-qkifxt`) merged, so two of the findings below went stale between when this file was written and when it actually landed on `main`. Re-checked directly against `origin/main` HEAD (`d5b8433`) source, not re-run live (see `docs/deployment-verification-2026-08-17.md` for why the live click-through is currently `BLOCKED` in this environment, and for the curl/content-level evidence that this source is in fact what's deployed).

### Changed since this audit was written — both by PR #99

1. **The "Nav wrapper" duplication (`CompanionShell` vs `AppShell`) is `FIXED`, not still open.** PR #99 (commit `fbe1e72`, item 1 of its audit list) gave `AppShell` a `"transparent"` variant and collapsed `CompanionShell` into a 16-line alias:
   ```tsx
   export function CompanionShell({ children }: { children: ReactNode }) {
     return <AppShell variant="transparent">{children}</AppShell>;
   }
   ```
   `/home` now gets the same `RightPanelProvider`/`FloatingAltitudeDial`/`TaskFullscreenModal`/resizable-sidebar behavior every other route gets — the gap flagged in the original "Nav wrapper note" above no longer exists. This also **already implements** the taxonomy proposal's first recommendation ("retire `CompanionShell` in favor of `AppShell` … with a transparent/fullBleed variant prop") — that line item is done, not still awaiting approval.

2. **`CompanionGlassPanelV2.tsx` (duplication example #2's dead-code entry) is deleted**, not merely unreferenced. PR #99 (same commit, item 5, "CONFIRMED dead … Deleted") removed the file outright after confirming zero import references. Two downstream corrections to this file's earlier counts:
   - "Four separate [glass panel] implementations" is now **three live** (`home.tsx` legacy chat, `EntityPanel` back-button chip, `ProjectEntryScreen`'s card) plus the deleted one — no longer a duplication concern, since there's nothing left to consolidate away.
   - The "seven different literal radii" list (duplication example #3) drops the `20px` (`CompanionGlassPanelV2`, dead code) entry — **five distinct live radii remain: 4px, 8px, 12px, 18px, 26px.**

### Re-confirmed unchanged (spot-checked against `origin/main` HEAD source)

- `PageHeroShell` is still the one real shared "variant 2" component (`journal.tsx`, `notes.tsx`, `project-details.tsx`, `project.$projectId.tsx`, `project-builder.tsx` all still import it); `EcosystemHeroLayout` in `ExperimentalHome.tsx` is still a hand-rolled fork with its own "Mirrors PageHeroShell's structural pattern" comment still in place (line 556) — neither #98 nor #99 touched this. Still open, taxonomy item 2 (parameterize `PageHeroShell` with an `animatedOverlay` prop, retire the fork) still awaiting approval.
- Journal (`journal.tsx`) and Notes (`notes.tsx`) still both `AppShell` + `PageHeroShell` — unchanged.
- Navigator (`navigator.tsx`) still bare `AppShell`, no hero/container — unchanged.
- `ItemSidepanel.tsx` still has no blur/glass treatment — unchanged. All five sidepanel implementations (`ItemSidepanel`, `EntityPanel`, `OrganiseSheet` + `ProjectStubPanel` on the shared radix `Sheet`, `TaskFullscreenModal`) still exist as separate files — unchanged, taxonomy item on `GlassSidepanel` still an open product decision, not implemented.
- `home.tsx`'s legacy Companion glass panel is still `blur(var(--glass-blur, 18px))` — unchanged.

### Net effect on the taxonomy proposal

Two of the five taxonomy line items are **already done** (`AppShell`'s transparent variant / `CompanionShell` retirement; the dead-code glass-panel removal that shrinks the blur-radii cleanup surface). The remaining three (`PageHeroShell`/`EcosystemHeroLayout` fork, the `BareLayout`/`FullscreenImageLayout` naming for variants 1/3, and the `GlassContainer`/`GlassSidepanel` product decision) are unchanged and still awaiting human approval before any consolidation work starts. No new duplication or drift was introduced by #98 or #99 — Logbook (#98) and shell-parity (#99) both landed cleanly on top of what this audit already described, and in one case (#99) incidentally fixed part of what this audit was going to recommend anyway.

---

## Out of scope, confirmed untouched

- `ProjectEntryScreen.tsx` visual bugs (wrong logo, hardcoded hex colors, fixed grid) — deferred, not the same bug as Part A, not modified.
- `AppSidebarExperimental` Logbook/Journal mislabeling — separate open item, not touched.
- Any renaming, extraction, or consolidation of the primitives discussed in the taxonomy — Part B is inventory only, awaiting approval.
- Rebuilding Auth/Welcome on any shared layout — explicitly the next follow-up, not this pass.
