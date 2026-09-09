# Briefing 01 — `xcamp-companion` Ground Truth Audit

**Date:** 2026-09-09
**Session scope:** `Xchange-ecosystem/xcamp-demo` only (this repo). `Xchange-Ecosystems/xcamp-companion` and `Xchange-Ecosystems/xcamp-sdk` could **not** be attached to this session — `add_repo` failed with "cross-tier adds are not supported in v1... session already has repos from owner(s) [xchange-ecosystem]" (note the org casing: `Xchange-ecosystem` vs. `Xchange-Ecosystems` are treated as different tiers by the tool). Every finding about those two repos below is therefore either (a) read from `xcamp-demo`'s own git history/docs, which several prior in-repo sessions used to reference cross-repo state, or (b) read from GitHub repo *metadata* only (`list_repos`), not repo contents. Tagged accordingly.
**Type:** Read-only. No application code changed. This report is the only artifact created, per Briefing 01's Phase 0 discipline.

---

## 0. Headline correction to the master map's framing

The master map (Section 2) frames the open question as: *"[xcamp-companion] believed to live inside `xcamp-sdk` monorepo as `@xchange/companion`, or folded into `xcamp-demo`."* Both framings are **CONFIRMED wrong as stated**, but each points at something real:

- `@xchange/companion` **does** exist inside `xcamp-sdk`, but it is a small internal UI-component package (`ChiCompanionPanel`, `CompanionCardStack`), not "`xcamp-companion`" the product/repo. These are two different things that happen to share a name.
- `xcamp-companion` (the GitHub repo) was **not folded into** `xcamp-demo`. Instead, a same-name-collision plus a rename event makes them look related. Per an in-repo doc from one day before this session (`docs/audits/microapps-inventory-2026-09-08.md:6`): *"`xcamp-companion` (formerly `xcamp-nox-founder-app`)."* That is, `xcamp-companion` is understood **within this repo's own audit trail** to be a rename/fork descendant of what is elsewhere still an actively-developed, separately-existing repo also called `xcamp-nox-founder-app` (`Xchange-Ecosystems/xcamp-nox-founder-app`, confirmed to still exist via `list_repos`, last pushed 2026-09-01). `xcamp-demo` (this repo) independently shares the **same original codebase skeleton** as both (identical `package.json` name, identical vendoring setup, identical docs/README, an identical copy of a prior cross-repo audit report — see §1) — evidence points to `xcamp-demo` having been forked from that shared lineage at some point, not "companion being merged into it."

So there are, at minimum, **three separate repos** carrying near-identical source at some point in their history: `xcamp-nox-founder-app`, `xcamp-companion`, and `xcamp-demo`. This session can only inspect `xcamp-demo` directly.

---

## 1. Identity & location

**Xcamp-companion-the-repo: CONFIRMED to exist as a standalone GitHub repo, contents BLOCKED.**
`mcp__Claude_Code_Remote__list_repos` returned `Xchange-Ecosystems/xcamp-companion` (private, `pushed_at: 2026-09-06T20:41:31Z`). This is repo *metadata* only — the tool could not be attached to this session (cross-tier error, see header), so no file in that repo was read this session.

**`@xchange/companion`-the-package: CONFIRMED, but not via direct inspection of `xcamp-sdk`.**
Not attachable this session either (same cross-tier error). Everything known about it here comes from files already vendored into `xcamp-demo` (below) plus one in-repo prior-audit document (`P0CrossRepoAuditReport.md:126-130`, dated 2026-09-03, written by an earlier session that evidently *did* have `xcamp-sdk` attached): `xcamp-sdk` is a pnpm monorepo with three packages — `@xchange/client`, `@xchange/companion` (contains the real UI: `CompanionCardStack`, `ChiCompanionPanel`), and `@xchange/generation` (not mentioned in the master map at all). This is **secondhand evidence carried over from a different session's context**, not independently re-verified here — flagging per the "merged ≠ live" discipline: it was true as of 2026-09-03, three weeks before today by that document's own dating, and could have drifted.

**What actually exists inside `xcamp-demo` (this repo) — CONFIRMED, direct inspection:**

`xcamp-demo`'s root `package.json:2` still declares `"name": "xcamp-nox-founder-app"` — a leftover from whatever repo this was forked from, never renamed. Its `README.md` is titled `# xcamp-nox-founder-app` and documents a **vendoring** workflow:

```
`@xchange/companion`, `@xchange/client`, and `@xchange/ui` are vendored under `vendor/` from their respective source repos.
```

Concretely, `xcamp-demo` contains:

| Path | What it is |
|---|---|
| `vendor/companion/src/{ChiCompanionPanel.tsx, ComponentRenderer.tsx, component-contract.ts, components/CompanionCardStack.tsx, index.ts}` | Plain copy-pasted source of `@xchange/companion` from `xcamp-sdk`. **No `package.json` inside `vendor/companion/`** — it is not a real package, just files. |
| `vendor/client/src/**` | Same treatment for `@xchange/client`. |
| `vendor/ui/src/**` | Same treatment for `@xchange/ui` (from `xcamp-designsystem`, via `xcamp-sdk`'s copy of it). |
| `tsconfig.json` `"paths"` and `vite.config.ts` `resolve.alias` | Both map `@xchange/companion`, `@xchange/client`, `@xchange/ui` straight to the `vendor/*/src/index.ts` files. **Not** a GitHub reference, **not** an npm dependency — `package.json`'s `dependencies` block has zero `@xchange/*` entries (confirmed via `grep -n "@xchange" package.json` → no matches). |
| `src/routes/demo.founder.companion.tsx` | A **demo-only, hardcoded-fixture** screen at `/demo/founder/companion`. Its own top-of-file comment: *"xcamp-nox-founder-app's Chi Companion Home wasn't reachable from this session (out of GitHub scope for this repo set...) — this follows the P1.1 mockup's own 'lite' Companion pattern instead."* It imports **nothing** from any `@xchange/*` package — just shadcn `Button`/`Input` and a hardcoded 3-message transcript array. This is a demo mockup of "a companion screen," unrelated to the vendored `@xchange/companion` package or to any live AI call. |
| `src/components/companion/{CompanionRail.tsx, ChatThread.tsx}`, `src/components/CompanionShell.tsx`, `src/lib/useCompanionSession.ts`, `src/contexts/companion-rail.tsx` | The app's **own, live, non-demo** companion chat surface, mounted app-wide from `AppShell` and specifically as the chrome of the `/home` route (`src/components/CompanionShell.tsx:5`: *"CompanionShell — the chrome for the companion surface (/home)... the real chrome for the live /home surface"*). This is a first-party build, not a copy of the vendored package — see §3 for exactly what it does import from the vendored package. |

**CONFIRMED:** within `xcamp-demo`, "companion" refers to **two unrelated things** that share the word: (1) a throwaway demo-mockup route under `/demo/founder/companion`, and (2) the app's actual, live AI-chat surface at `/home`, which is a first-party component tree that reuses one small utility from the vendored `@xchange/companion` package. Neither is "xcamp-companion the product repo" running inside `xcamp-demo`.

---

## 2. Development status

**"Not further developed" (master map's claim about `xcamp-companion`-the-repo): CONTRADICTED by GitHub metadata, contents unverified.**
`list_repos` shows `Xchange-Ecosystems/xcamp-companion` with `pushed_at: 2026-09-06T20:41:31Z` — three days before this audit, and *after* the most recent vendor-sync commit inside `xcamp-demo` (`27beda1`, 2026-09-04). A repo pushed to three days ago is not, on this evidence, in a frozen/dormant state. **This session could not read what was pushed** (cross-tier block) — it is possible the push was trivial (a merge of an already-open PR, a CI config tweak, etc.), so "not further developed" as a *human decision* to stop feature work could still be accurate even with recent pushes. Flagging the contradiction as instructed, not resolving it: **Alex should treat "not further developed" as unconfirmed, not settled**, and ideally get a direct read of `xcamp-companion`'s recent commits (needs a session scoped to the `Xchange-Ecosystems` tier, or the `xcamp-companion` repo added as this session's *initial* source rather than a secondary one).

**Within `xcamp-demo`, companion-adjacent code is actively developed, including today.**
```
7ee697a 2026-09-09 16:18 "Companion altitude: widen info panel to 50/50, add glass backing to chat"
3b8b06f 2026-09-09 15:53 "Add Companion-first guidance altitude for Founder demo"
27beda1 2026-09-04 23:47 "Resolve repository quality and E2E debt" (touches vendor/)
ae5f24a 2026-09-03 12:01 "Amend dark-theme brand color: teal for xcamp-companion, not Nox purple"
e06677e (undated in this log slice) "P1.0: wire design-system tokens, add shared mock-data layer, add Card Feed component"
ca15978 2026-08-25 09:13 "Merge pull request #110 ... companion-project-scope-bl30" (earliest commit reachable in this shallow clone)
```
Note: this repo's clone is **shallow** (`git rev-parse --is-shallow-repository` → `true`, 140 commits total reachable), so `ca15978` is the oldest commit *this checkout can see*, not necessarily `xcamp-demo`'s true first commit — can't rule out earlier history existing on the full remote.

---

## 3. Inbound dependencies (who imports `@xchange/companion`)

| Consumer (within this session's scope) | File | Live or dead |
|---|---|---|
| `xcamp-demo` | `src/components/companion/ChatThread.tsx:5-6` — `import { ComponentRenderer } from "@xchange/companion"; import type { ComponentPayload } from "@xchange/companion";` | **Live.** `ChatThread` is rendered from `src/routes/home.tsx` (a real, non-demo route, confirmed via `grep`), which is the app's actual companion chat UI, wired to Supabase (`useCompanionSession`) and to a live outbound API call (§4). |
| `xcamp-demo` — `ChiCompanionPanel.tsx` itself | `vendor/companion/src/ChiCompanionPanel.tsx` | **Vendored but dead in this repo.** This file exists in `vendor/`, but `grep -rn "ChiCompanionPanel" src` returns nothing — no file in `src/` imports it. Only the narrower `ComponentRenderer` utility from the same package is actually used (row above). |
| `xcamp-nox-founder-app` / `xcamp-companion` (the repos) | — | **BLOCKED** — not attachable this session (cross-tier). Given the `P0CrossRepoAuditReport.md` note that `xcamp-nox-founder-app`'s `src/`/`docs/` were "largely identical" to `xcamp-companion`'s as of 2026-09-03, it's plausible both wire up companion similarly to `xcamp-demo` (same vendoring README, same `vendor/` pattern) — but this is inference from a stale secondhand doc, not independently confirmed. |

Separately — **`@xchange/client`** (not `@xchange/companion`, but the sibling vendored package) is imported live in several more places in `xcamp-demo` (`src/routes/home.tsx`, `src/components/JournalFlow.tsx`, `src/lib/goals-generation.ts`, `src/lib/organiser-api.ts`, `src/lib/ai-summary.ts`, `src/hooks/useVox.ts`, `src/lib/journal-api.ts`, `src/components/ExperimentalHome.tsx`) — worth noting since the master map's "outbound dependencies" question (§4 below) mostly runs through this package, not `@xchange/companion` itself.

**`@xchange/ui`** — **zero import matches** anywhere in `src/` (confirmed: `grep -rn 'from "@xchange/ui"' src` → no results). It is vendored into `vendor/ui/` but not consumed by any app component; the app uses shadcn/Radix (`src/components/ui/*`) with its own token system instead. This matches the same finding already recorded in `P0CrossRepoAuditReport.md:61` for the companion-lineage codebase generally.

---

## 4. Outbound dependencies

| Target | Endpoint / import | Live or dead |
|---|---|---|
| Supabase (`ueebzuleyrnsrxbowdfa`, per `.env.example`) | `src/lib/useCompanionSession.ts` — direct `supabase.from("jarvix_conversations")` / `supabase.from("jarvix_messages")` reads/writes (`useCompanionSession.ts:159-204, 225-289`) | **Live.** This is the real message-persistence path for the `/home` companion chat. |
| "Vox" API (env var `VITE_VOX_API_URL`, `.env.example` value `https://xcampapi.xchange.eco`) | `src/hooks/useVox.ts:9` → `voxFetch("/api/answer-with-context")` → `src/integrations/vox/client.ts:28` → `fetch(`${VOX_API_URL}${path}`)` → full URL `https://xcampapi.xchange.eco/api/answer-with-context` | **Live** — `useVox().call(...)` is invoked from `src/routes/home.tsx` at 3 call sites (lines 372, 449, 706), i.e. from the live `/home` companion surface. |
| Same "Vox" API, via the *vendored* client instead of the app's own hook | `vendor/client/src/vox/client.ts:22,41` → `vendor/client/src/vox/assistant.ts` (`answerWithContext`) — same `${VITE_VOX_API_URL}/api${path}` pattern | **Dead in `xcamp-demo`** — only reachable through `ChiCompanionPanel.tsx`, which (per §3) is never imported by any `src/` file. |
| xcamp-backend `/api/proposals/execute` | `vendor/client/src/proposals/executeProposal.ts:34` — `fetch(`${backendUrl}/api/proposals/execute`, ...)` | **Dead in `xcamp-demo`**, same reason (`executeProposal` is imported only inside the unused `ChiCompanionPanel.tsx`). Also independently broken even if it were reachable: `ChiCompanionPanel.tsx:460` calls it as `executeProposal(card.proposal, getSessionToken, "")` — an empty-string `backendUrl`, which makes the function's own `if (backendUrl)` guard false and always falls through to a Supabase RPC fallback, never actually hitting the backend route. |
| `chi-orchestration`, `vox7` (the standalone DO-hosted services named in the master map) | — | **Not found.** No file in `xcamp-demo` references `chi-orchestration`, a `vox7`-specific hostname, `/api/generate`, `/api/chi`, or `/proxy/:appId`. The "Vox" naming in this codebase (env var `VITE_VOX_API_URL`) is an **alias for `xcamp-backend`** — `.env.example` sets `VITE_VOX_API_URL` and `VITE_BACKEND_URL`/`VITE_BACKEND_API_URL` to the *identical* value (`https://xcampapi.xchange.eco`). This is worth flagging to Alex as a naming collision distinct from the master map's `vox7`: **this codebase's "Vox" calls go to xcamp-backend, not to the standalone `vox7` memory/search service** the master map describes. Whether `xcampapi.xchange.eco` is in fact the public hostname for the `64.226.102.72` droplet is plausible but **BLOCKED** — not independently confirmed from this session (would need DNS/backend-repo access). |

---

## 5. Theming — CONFIRMED, actual token values

The briefing's memory ("companion uses a teal palette in both light and dark mode, diverging from `xcamp-nox-founder-app`'s Xcamp/Nox light/dark split") is **CONFIRMED**, with an explicit commit trail explaining it as a deliberate, named "xcamp-companion" branding decision baked into this shared codebase lineage — not something unique to a separate `xcamp-companion` app.

`src/lib/brand.ts` (in full):
```ts
// xcamp-companion is single-brand: Xcamp in both light and dark mode. It no
// longer follows xcamp-nox-founder-app's Xcamp(light)/Nox(dark) brand split
// — dark mode gets a teal-brand-appropriate accent (see styles.css's .dark
// block), not a separate "Nox" identity. `isNox` is kept (always false) so
// existing call sites that branch on it don't need individual edits.
export function useBrand() {
  return { isNox: false as const, name: "Xcamp", logoUrl: xcampLogo, iconUrl: xcampIcon };
}
```

`src/styles.css` actual values:
- Light mode (`:root`): `--primary: hsl(168 72% 42%)`, `--skin-accent: hsl(168 72% 42%)`, `--skin-accent-gradient: linear-gradient(120deg, hsl(190 57% 47%) 0%, hsl(170 70% 59%) 100%)`.
- Dark mode (`.dark`): `--primary: hsl(168 65% 48%)`, `--skin-accent: hsl(168 65% 48%)`, `--skin-accent-gradient: linear-gradient(135deg, #1f6b7a, hsl(168 65% 48%), #3cddc2)`.

Both are teal-family hues (~168°), confirming the light/dark split is teal-vs-teal (tuned for contrast), not teal-vs-purple. The **canonical Nox purple** (`hsl(264 85% 47%)`) still exists as `DARK_BRAND_TOKENS` in `vendor/ui/src/skin/tokens.ts:127-134`, explicitly commented as "still canonical for other consumers (e.g. `xcamp-nox-founder-app`)... this DARK_BRAND_TOKENS purple value is still canonical" — i.e., the design-system source of truth still encodes the Xcamp/Nox split for the *founder-app* identity; this codebase (`xcamp-demo`, sharing "xcamp-companion" branding intent per its own comments) explicitly overrides it. Commit `ae5f24a` (2026-09-03, message: *"Amend dark-theme brand color: teal for xcamp-companion, not Nox purple"*) is the change that did this, citing "explicit human decision."

---

## 6. Deployment status

**No `xcamp-companion`-specific deployment found or reachable from this session — largely BLOCKED.**

- `xcamp-demo` has its own generic `vercel.json` (build/install commands, SPA rewrite, PWA cache headers) with no project identifiers in it, and no `.vercel/` project link in the working tree.
- The one **concretely confirmed live deployment** anywhere in this repo's evidence trail is documented in `docs/deployment-verification-2026-08-17.md` (a prior session's audit, itself in this repo): Vercel project `xchange-ecosphere/xcamp-nox-founder-app` (`projectId: prj_CjzHINqoASrGeVuvyAc6VNmUgrT9`), serving `https://xcamp-nox-founder-app.vercel.app`, confirmed via `curl -I` → `HTTP/2 200`, with content-level bundle diffing confirming it served `origin/main` HEAD at that time (2026-08-17) — **not** `xcamp-demo`'s own deployment, and predates/parallels the "formerly xcamp-nox-founder-app" rename to `xcamp-companion` noted in §0.
- That same document flags an unresolved custom-domain question: source code hardcodes `DEEP_LINK_BASE = "https://xcamp.xchange.eco/app/project"`, and DNS lookups for that and sibling subdomains (`app.`, `nox.`, `founder.xchange.eco`) failed to resolve from that session's sandbox — left `BLOCKED` there too.
- I did not attempt to guess or construct a `xcamp-companion`-branded URL not already present in a file, per this session's own instruction against fabricating URLs — so I cannot report on a "companion" subdomain/preview one way or the other.
- Per the master map, `xcamp-demo` itself deploys to "Vercel, `Xchange-ecosystem` personal account" — separate from the `xchange-ecosphere` team account hosting the confirmed deployment above. This session found no in-repo evidence (Vercel project files, CI secrets references, etc.) confirming or denying that `xcamp-demo` is actually live at present; `.github/workflows/cd.yml` exists (confirms a CD pipeline is configured) but its target/trigger was not inspected this session (out of the briefing's stated scope — deployment status of `xcamp-companion`, not `xcamp-demo` itself).

**Bottom line: whether `xcamp-companion` (the repo) has any live deployment today is unconfirmed** — the only deployment this session could concretely verify belongs to the pre-rename `xcamp-nox-founder-app` Vercel project, documented three weeks before this audit.

---

## 7. Open questions / could not be resolved read-only

1. **What does `xcamp-companion` (the repo) actually contain right now, and what was pushed on 2026-09-06?** Blocked by this session's repo-tier restriction (`Xchange-Ecosystems` vs. `Xchange-ecosystem`). Needs a session where `xcamp-companion` is the *initial* attached source, not a secondary `add_repo` call from an `xcamp-demo`-rooted session.
2. **Is `xcamp-companion` really "formerly `xcamp-nox-founder-app`" (a GitHub rename), or a fork that kept old identifying strings?** The one piece of in-repo evidence for this (`docs/audits/microapps-inventory-2026-09-08.md:6`) states it as settled fact but doesn't cite its own source/evidence — it reads as inherited context from a session this report can't verify. `Xchange-Ecosystems/xcamp-nox-founder-app` still exists as a separately-pushed repo today (`list_repos`, pushed 2026-09-01), which is a bit unusual if `xcamp-companion` truly *is* that repo renamed — a rename wouldn't leave the old name behind as a live repo unless the name was later reused for a new/different repo. This needs a direct check (repo creation dates, or asking whoever renamed it).
3. **Is `xcamp-demo`'s own deployment (distinct from the confirmed `xcamp-nox-founder-app` Vercel project) actually live**, and does it carry the same `VITE_VOX_API_URL`/`VITE_BACKEND_URL` pointed at real production infra as `.env.example` suggests? If so, this is worth flagging against the master map's stated constraint that `xcamp-demo` "must not depend on backend/chi/vox" — `.env.example` values alone don't prove what's actually set in Vercel's environment-variable dashboard, so this is a **should-check**, not a confirmed violation.
4. **Does `xcamp-companion` (or `xcamp-nox-founder-app`) use `ChiCompanionPanel.tsx` live**, where `xcamp-demo` does not? This session confirmed `xcamp-demo` never imports it, but that says nothing about the sibling repos, which may render it directly (it looks designed to be a drop-in whole-panel component, unlike `xcamp-demo`'s custom-built `ChatThread`/`CompanionRail`).
