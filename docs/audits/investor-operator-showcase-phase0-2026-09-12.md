# Investor/Operator Platform Showcase — Phase 0 Audit

**Date:** 2026-09-12
**Type:** Read-only, source-only audit. No application code changed by this document.
**Repo:** `Xchange-ecosystem/xcamp-demo`, branch `claude/investor-operator-showcase-6es1ro`.
**Scope:** Resolves the four open items from the session brief (§7) plus every factual claim the brief makes about existing code, before any Phase 1 code is written.

---

## 1. Investor demo persona — current structure

**CONFIRMED — the brief's premise needs correcting.** There is no dedicated investor "Home" screen. `src/routes/demo.investor.index.tsx` (`/demo/investor`) and `src/routes/demo.investor.portfolio.tsx` (`/demo/investor/portfolio`) are two separate route files that render the *same* component, `InvestorPortfolioScreen`, each wrapped in its own copy of `DemoShell` with an identical, duplicated single-item nav array. The nav label is **"Portfolio"**, not "Home":

```tsx
// demo.investor.index.tsx, verbatim
// No dedicated investor home screen exists yet (see Phase 0 audit) — reuses
// InvestorPortfolioScreen, same as /demo/investor/portfolio, so /demo/investor
// resolves instead of 404ing.
const investorNavItems: DemoNavItem[] = [
  { to: "/demo/investor", label: "Portfolio", icon: Briefcase, exact: true },
];
```

There is also no investor-persona `*Shell` wrapper component (unlike Founder's `FounderShell.tsx`) and no `demo.investor.tsx` layout route — investor and collaborator routes call `DemoShell` directly.

**Resolution:** this is not a conflict once read against §4 of the brief. The brief's own Project View spec (§4) introduces "Home" as a *project-scoped* screen that only appears after drilling into a project — which doesn't exist today either. So: keep the existing ecosystem-level screen's nav label as **"Portfolio"** (matches §2 of the brief directly), and build "Home" fresh as the Project View's first tab (§4), investor-flavored from `demo.founder.index.tsx`. No naming collision, no user decision needed.

**CONFIRMED — no project/ecosystem switcher exists anywhere in the demo layer.** The only switcher in `DemoNavRail` is `PersonaSwitcher` (Founder/Investor/Collaborator), rendered for every persona. There is no "Solari Energy" switcher in the Founder nav, and no project-switcher component of any kind under `src/components/demo/` or `src/components/founder/` — grepped `Solari` and `switcher` repo-wide, only fixture data and one match in the *functional* app.

**CONFIRMED — the actual pattern to clone lives in the functional app**, at `src/components/AppSidebarExperimental.tsx`, backed by `src/contexts/active-project.tsx`. It's a two-segment Ecosystem/Project control:
- `ActiveProjectProvider` exposes `activeProjectId` (persisted to `localStorage`) and an independently-toggleable `navMode: "ecosystem" | "project"`.
- The rail renders an "Ecosystem" segment (always switches to ecosystem mode) and a "Project" segment (shows the active project's name when one is set, opens a searchable dropdown of `listProjects()` otherwise).
- Nav item lists (`ECOSYSTEM_NAV` / `PROJECT_NAV`) swap based on `navMode`, filtered by `persona`.

This is the pattern §1 of the brief describes ("cloned from the functional app's project switcher pattern") — the brief's "Solari Energy" label was an incorrect guess at what it's called, not a separate real thing. **Resolution:** clone this Ecosystem/Project segmented-control mechanism (fixture-backed `navMode` + `activeEcosystemId`/`activeProjectId` state, no `localStorage`/real API needed) into a new `InvestorEcosystemSwitcher` inside the investor nav rail area, generalized one level up (Ecosphere-of-ecosystems is out of scope for the switcher itself, which only needs Ecosystem ⇄ Project per the brief).

**CONFIRMED — `RankedPortfolioBars` has no threshold-line concept.** It renders "N projects, ranked against your mandate" as a hand-rolled absolutely-positioned bar list (not `recharts`, despite `recharts` being a dependency), with an 8-week scrubber/timeline and per-row gain/pullback markers. There is no rendered reference line and no threshold value in `PortfolioEntry`. This is genuinely new work, not an existing feature to extend — the brief's ask (a vertical line tied to the match-% lever) is additive to this component.

## 2. Functional app's Portfolio View and Ecosystem Navigator

**CONFIRMED — Portfolio View exists, but its tabs are not the six the brief hypothesized.** `src/features/portfolio/PortfolioView.tsx` (routed at `/portfolio`) is a real, Supabase/API-backed screen with:
- Tabs actually present: `all / owned / collaborations / watchlist / viewer`, persona-scoped (investor sees `all / watchlist / viewer` only) — **not** All/Watchlist/Shortlist/Access/Dealflow/Invested.
- A real collapsible filter accordion (Status + Tags checkboxes derived from loaded data, search, sort dropdown) — this part matches the brief's ask structurally, just with different filter fields (no match-%, risk, round, ask, ticket-size in the real app).
- A disabled "Audience" switch (`overview | marketplace | investor`, the latter two "SOON"-badged) — the app's own established convention for an unbuilt sub-feature.
- Cards (`PortfolioProjectCard.tsx`) show cover/tags/objective-progress/collaborator-count — no match-%/risk/round/ask/ticket-size fields exist on `Project` today.
- Click-through opens `ProjectStubPanel.tsx`, a `Sheet`-based slide-in with cover/name/description/tags/progress/members, and a persona-specific CTA footer (investor gets a real "Add to Watchlist" toggle or an intentionally-unwired "Request details" button with `toast("Request details isn't wired up yet.")`).

**Resolution:** clone the *interaction shape* (filter accordion, tabbed list, sheet slide-in with CTA footer) from `PortfolioView`/`ProjectStubPanel`, but build the demo's own tab set exactly as specified in brief §2 (All/Watchlist/Shortlist/Access/Dealflow/Invested) and its own filter fields (match-%, risk, club deals, round, ask, ticket size) against new fixtures — the six-tab, six-filter shape is new product surface for the investor persona, not a literal port.

**CONFIRMED — `/ecosystem-navigator` is not a network graph.** It's a live-API grid of *people* tiles ("Everyone in the Xcamp ecosystem"), no canvas, no grid/network toggle, no altitude concept. **CONFIRMED — the actual network-graph feature lives at `/navigator`** (`NavigatorGraph.tsx`), single-project-scoped (Project → Objective → Task radial layout), built on `@xyflow/react` (React Flow, already a dependency: `^12.11.2`) with `Background`/`Controls`/`MiniMap`, drag-to-reposition, and an "Arrange" reset. `ecosystem-dashboard.tsx` is a bare `ComingSoonPage` placeholder — no ecosystem-wide dashboard exists anywhere yet.

**Resolution (open item 2):** the brief's "Ecosystem Navigator... cloned from the functional app's user overview" grid view = `ecosystem-navigator.tsx`'s people-tile grid, reused visually. The network view and the three-stage altitude lever (Ecosphere/Ecosystem/Project) have **no existing cross-project precedent anywhere in the app** — this is new canvas work. **Resolution (open item 4):** reuse `@xyflow/react` rather than adding a new library, since it's already a dependency and already proven for node/edge canvases in this codebase; the existing `NavigatorGraph.tsx` custom-node/radial-layout pattern is the template to follow for the new multi-altitude network.

## 3. Founder Home/Dashboard/Pitchdeck adaptation

**CONFIRMED.** `demo.founder.index.tsx` (Home) = composer (mode pills, mock LLM processing → `ProposalModal`) + action-item `CardFeed` + `RightColumn`. `demo.founder.dashboard.tsx` (Dashboard) = 4-tile KPI grid (`ECOSYSTEM_METRICS`) + "Recent updates" `CardFeed` using `investorUpdateConfig` (already investor-flavored copy: *"Where your projects stand, in the terms an investor asks about"* — built for exactly this reuse). Both are fixture-only, no adaptation blockers.

**CONFIRMED — the brief's claim that Pitch is "Recap-based" is incorrect.** `PitchScreen` and its sub-components (`PitchMasthead`, `PitchCardStrip`, `PitchStage`, `EvidenceRail`) import only from `src/fixtures/{pitch,projects,objectives}` — zero references to `recap-api`, `RecapComposer`, or anything under `src/features/recap/`. `src/fixtures/pitch.ts` says so directly: *"No production analog exists for 'a composed pitch card' yet — this whole file is P1-only."* The real Recap flow (`src/features/recap/RecapComposer.tsx` + `PublicRecapPage.tsx`, `api/recap/{extract,publish}.ts`) is a completely separate, live-Supabase, transcript-extraction-and-email feature behind `/admin/recap` and `/recap/:token` — unrelated data model, no shared code.

**Resolution (open item 3):** the brief's instruction to reuse "the existing Recap-based tool as-is" doesn't apply — there is no Recap-based pitch tool. What exists and fits the fixture-only, no-backend-calls constraint is `PitchScreen` (fixture-driven, Objective-evidence-composed cards). Build the investor Pitchdeck tab as a read-only, investor-flavored wrapper around `PitchScreen` (same cards/evidence rail, no "Recompose"/"Compose" authoring actions since those are Founder-only actions on their own evidence) — this satisfies "reuses the existing pitch tool as-is; confirmed out of scope for modification" in spirit, just naming `PitchScreen` correctly instead of Recap.

## 4. Fixtures

**CONFIRMED.** `src/fixtures/types.ts` has `Project` (`id, name, description, color, featureImage, status, tags, ownerId, updatedAt`) and `PortfolioEntry` (`projectId, rank, performanceScore, performanceDeltaPct, investedAmount, currentValuation, scores[8]`) — **no** match-%, risk-level, round, ask, ticket-size, or label-state (watchlist/shortlist/access/dealflow/invested) fields exist anywhere in the fixture layer today. 8 mock projects exist (`proj-1`..`proj-8`), 12 people (4 founders/2 investors/5 collaborators/1 admin), all cross-referenced by stable string IDs per the fixtures README's own stated invariant ("no orphaned references") and derived-vs-authored rule (metrics/ranks must be computed, never hand-authored in parallel with source rows).

**Resolution:** none of this session's new filter/label/network fields exist yet — confirmed net-new fixture work exactly as brief §5 describes, no rework of existing fixtures needed beyond adding new files/fields that follow the same ID-cross-referencing and derived-vs-authored conventions.

## 5. Other conventions confirmed

- **Disabled-feature copy:** the brief's exact string ("This feature is not activated in the demo. Contact admin@xchange.eco.") does not exist anywhere (grepped, zero hits), and the existing convention's contact address is `claas@xchange.eco`, not `admin@xchange.eco`. The existing mechanism is a shared `src/components/ComingSoonPage.tsx` (`icon/title/subtitle` props) plus inline `disabled` buttons with a "SOON" badge for narrower cases. **Resolution:** reuse `ComingSoonPage` for any full-screen unbuilt placeholder this session, passing the brief's exact copy as its `subtitle`; use the inline disabled+"SOON" pattern for narrower disabled controls. No new component needed.
- **`routeTree.gen.ts`:** confirmed gitignored (`.gitignore:45`), left alone.
- **Canvas/chart libraries available:** `@xyflow/react` ^12.11.2 (network canvas — use for Ecosystem Navigator) and `recharts` ^2.15.4 (present but unused anywhere read this session — available for the match-score bar chart + threshold line, though the existing `RankedPortfolioBars` hand-rolled-div approach is equally viable and cheaper to extend in place; decided in favor of extending `RankedPortfolioBars` directly to keep its existing scrubber/animation behavior rather than rewriting it on `recharts`).

## 6. Net effect on the Phase 1 plan

No blockers. Three corrections to carry into implementation:
1. Investor's existing single screen keeps its "Portfolio" label; "Home" is new, project-scoped, built in Phase 1 §4.
2. The project/ecosystem switcher clones `AppSidebarExperimental`'s Ecosystem/Project segmented-control mechanism (not a nonexistent "Solari Energy" switcher), reimplemented fixture-only for the investor nav.
3. Pitchdeck wraps `PitchScreen` (not Recap) in a read-only investor variant.

Everything else in the brief (Portfolio View filters/tabs, Ecosystem Navigator altitude lever, new fixtures) is net-new work with no existing component to conflict with, confirmed above.
