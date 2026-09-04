# Xcamp P1 — Session Briefing (Shared Context)

Read this before any P1 session prompt. It's the context every P1.0 prompt refers back to instead of repeating itself.

## What P1 is

A standalone presentation demo — **not** a production feature. Built to be shown live on a video call to investors and operators, demonstrating that the three value propositions fit all four stakeholder groups (Founder, Investor/Operator, Collaborator, Admin). Mock data throughout, except the Admin transcript-extraction feature, which calls chi-orchestration for real AI extraction.

**Timeline: live in 1 week.** **Team:** Fabian, Pascal, Alex, working in parallel with Claude.ai + Claude Code.

## What P1 needs to deliver (5 screens)

1. **Founder** — input/upload field, action-item card feed, right-column metrics, mock-processing → proposal modal, plus lighter Companion/Navigator/Dashboard screens
2. **Investor/Operator Portfolio** — animated ranked bar list, horizontal project selector, update-card feed, ecosystem metrics
3. **Investor Dashboard** *(new)* — central hub combining a Companion chat panel with a key-metrics summary, analogous to the Founder's Companion Home
4. **Collaborator** — assignment feed, metrics + value wallet
5. **Admin** — transcript upload → real chi-orchestration extraction → editable task/assignee list → email preview → send

## Repos

**xcamp-companion** — new standalone repo, primary repo for all 5 screens. Not xcamp-nox-founder-app.

**Most of P1 has no backend dependency.** Founder, Investor/Operator Portfolio, Investor Dashboard, and Collaborator (P1.1, P1.2, P1.6, P1.3) are pure frontend against mock fixtures — no xcamp-backend, no production auth. P2 is what wires these to real data.

**P1.4 (Admin) is the one exception.** It genuinely needs **xcamp-backend** for two real endpoints: the transcript-extraction passthrough (which calls chi-orchestration for real AI extraction) and the email-send endpoint. This is intentional — real extraction is a much stronger demo moment than faking it, for roughly the same effort. Anyone picking up P1.4 works across both xcamp-companion (UI) and xcamp-backend (these two endpoints), following the existing auth pattern already used for chi-orchestration calls (SEC-02 enforcement).

## What to reuse (read-only reference during Phase 0 of every session)

- **xcamp-designsystem** (`@xchange/ui`) — **tokens/theming only** (confirmed by P0 audit, 2026-09-03: `skin/*`, `tokens/layout|spacing|shadows`, `claude-design/*` — no actual UI components exist in the package, despite the name).
- **`@xchange/companion`** (xcamp-sdk) — **this is where the real UI components live**: `CompanionCardStack`, `ChiCompanionPanel`. Pulls `@xchange/ui` in for tokens only.
- **Decision recorded (2026-09-03):** P1 formally adopts `@xchange/companion` + shadcn/Radix as the UI layer, with `@xchange/ui` supplying tokens only. This matches what xcamp-companion already organically did — CLAUDE.md's "all UI must use xcamp-designsystem exclusively" rule is being reinterpreted as "tokens must come from xcamp-designsystem; components come from `@xchange/companion` or shadcn." Do not build new components into `@xchange/ui` on the assumption it's the component library — it isn't.
- **xcamp-sdk** is a 3-package pnpm monorepo: `@xchange/client` (API/data layer), `@xchange/companion` (UI components, see above), `@xchange/generation` (pluggable LLM abstraction — `GenerationPort`, `ChiAiAdapter` — directly relevant to P1.4's chi-orchestration call).
- **xcamp-nox-founder-app** (reference only) — `AppShell` is real and mounted app-wide; `PanelHeader`/`PanelToolbar`/`NavRail`/`ContentArea` as separate named components were never built (confirmed GAP, P0 audit). Reference `AppShell` as it actually exists, not a 5-component decomposition. `GoalsFeed.tsx` (388 lines, domain-specific) is a reasonable extraction candidate for the Card Feed component rather than building from zero. `NavigatorBrowser.tsx` is the confirmed reference for the Collaborator feed (not Logbook).
- xcamp-nox-founder-app and xcamp-companion share near-identical `src/`/`docs/` — findings in one are informative for the other.

## P1.0 status — ALL DONE (as of CC session, 2026-09-03)

- ✅ **Scaffold + routing** — done with caveats (19 real routes; screen-to-route mapping not yet confirmed against the WBS)
- ✅ **Deployment pipeline** — done with caveats (live Vercel deploy confirmed; no GitHub Actions/CI)
- ✅ **Wire design-system tokens** — PRs [xcamp-companion#135](https://github.com/Xchange-ecosystem/xcamp-companion/pull/135), [xcamp-designsystem#11](https://github.com/Xchange-ecosystem/xcamp-designsystem/pull/11), both clean, still open (draft). Tokens wired from `@xchange/ui`'s `tokens.json` directly into `styles.css`'s `:root`/`.dark` blocks (no `SkinProvider` exists). **Dark theme is now teal end-to-end in xcamp-companion — fully done, verified visually.** This required more than a color change: `src/lib/brand.ts`'s `useBrand()` (consumed in 10 files) previously switched the app's name/logo/icon to "Nox" in dark mode — now unified to Xcamp. The light/dark toggle and the Appearance theme picker previously read "Xcamp"/"Nox" as the two options; **relabeled to "Light"/"Dark"** instead (confirmed final, 2026-09-03 — making both options say "Xcamp" would have been a UX bug). Static theme-independent mentions (PWA title, meta tags — still "Xcamp Nox") were left alone, out of scope. xcamp-nox-founder-app confirmed unaffected (separate repo, forked from shared history, not a shared file).
- ✅ **Mock-data layer** — `src/fixtures/` (people/projects/objectives/tasks/metrics/portfolio/feed/transcripts/chat/wallet), typed, cross-referenced. The two pre-existing narrow mocks (`investorMetricsMock.ts`, `ecosystemNavigatorMock.ts`) were kept separate — still in use by their original screens, not part of this shared layer.
- ✅ **Card Feed component** — `CardFeed<T>` (built fresh, not extracted from `GoalsFeed.tsx` — that turned out to be too coupled), config-object-per-use-case pattern, documented with a README. Covers all three P1 feed kinds.

**P1.0 is entirely done, pending the two PRs (xcamp-companion#135, xcamp-designsystem#11) merging.** P1.1, P1.2, P1.3, and P1.6 can all start once that merge lands.

## Standing rule for every session

Every session starts with a **Phase 0 audit**: what already exists relevant to this task, what can be reused, what has to be changed or built anew, and any blockers/risks/dependencies. Phase 0 is read-only — report findings, tag each as `CONFIRMED` / `GAP` / `BLOCKED` / `DIVERGES`, and do not proceed to Phase 1 implementation if Phase 0 surfaces a blocker. Wait for go-ahead in that case rather than guessing.

## Known open risk

CFM-01–06 (the P0 confirm-and-map pass) may not be fully closed out yet. Specifically: the persona-rail regression (CFM-01) and the panel-shell consolidation status (CFM-04) are visual/behavioral references these sessions lean on. **Each Phase 0 below re-checks the specific slice it needs rather than assuming CFM findings are current** — treat CFM as a starting pointer, not a substitute for looking.

## This round: P1.0 — Shared Foundation

Five tasks. Dependency order:

```
Scaffold app shell + routing
  → Wire design-system tokens
    → Build Card Feed component
Build mock-data layer/fixtures        (parallel, only needs scaffold to exist)
Set up deployment pipeline            (parallel, only needs scaffold to exist)
```

Recommended split for 3 people: one person owns the Scaffold → Tokens → Card Feed chain (it's sequential and blocks everything downstream in P1.1–P1.6), the other two take mock-data and deployment pipeline in parallel, then help pick up P1.1–P1.3 screens once the chain clears.

Reference: [ClickUp WBS](https://app.clickup.com/2666726/v/l/li/1200600000002261), P1.0 epic.
