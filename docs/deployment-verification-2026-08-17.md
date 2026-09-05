# Deployment Verification (Phase 0, blocking) + Part B live re-check

**Date:** 2026-08-17
**Trigger:** PRs #98, #99, #100 merged to `main`; human reported the live production app showed no visible change, even after unregistering the service worker and clearing local storage (ruling out client-side caching).

**Session network constraints, stated up front:** This session has no Vercel API token or CLI login (`vercel whoami` returns "Logged out", no `VERCEL_TOKEN` in env, no `.vercel/` project link). It also runs behind a policy-enforcing egress proxy that allows plain HTTPS (`curl`) to `*.vercel.app` but rejects the custom domain referenced in source (`xcamp.xchange.eco`, `CONNECT` → 502) and resets Chromium/Playwright connections to `xcamp-nox-founder-app.vercel.app` specifically (works fine over plain `curl`, fails 100% of the time — 3/3 attempts — over Playwright, before and after disabling QUIC/HTTP2 and ignoring cert errors). Every item below is tagged with exactly what could and could not be checked given these constraints.

---

## Part A — Deployment forensics

### Step 1 & 2 — origin/main history — `CONFIRMED`

The local checkout's `main` branch was stale (`00cbef5`, PR #97) at the start of this session — **that was a local git-checkout artifact, not a repository or deployment problem.** After `git fetch origin main`:

```
d5b8433 Merge pull request #100 from Xchange-ecosystem/claude/welcome-duplication-diagnosis-1w6u05
cbf9622 docs: welcome duplication diagnosis + layout/wrapper audit (2026-08-17)
ddc7aac fix(ecosystem-home): stop the intro overlay from re-saying the greeting
caa0f62 Merge pull request #98 from Xchange-ecosystem/claude/journal-notes-audit-a4ry2a
e085707 Merge pull request #99 from Xchange-ecosystem/claude/pr-95-regressions-audit-qkifxt
```

`origin/main` HEAD is `d5b84336947c5f3c2b21a44ad0b84576e0170e7f`, merged 2026-08-17T11:15:47Z. All three merge commits (#98, #99, #100) are present in `origin/main`'s history — confirmed by `git log origin/main --oneline --merges`.

### Step 3 — domain alias — `CONFIRMED` for the default domain, `BLOCKED` for any custom domain

Via the `vercel[bot]` preview comment on PR #100, the Vercel project is confirmed as **`xchange-ecosphere/xcamp-nox-founder-app`** (`projectId: prj_CjzHINqoASrGeVuvyAc6VNmUgrT9`, team `team_pCxAZFJ3C1b0eohiLhhSiQAT`) — not the deprecated `xcamp-foundation`.

The project's default alias, `https://xcamp-nox-founder-app.vercel.app`, is reachable and serves the app (see Step 4).

**Not verifiable from this session:** `src/lib/backcaster-api.ts:455` hardcodes `DEEP_LINK_BASE = "https://xcamp.xchange.eco/app/project"` — a strong hint the human may be testing against a custom domain (`xcamp.xchange.eco`) rather than the raw `.vercel.app` alias. This session's egress proxy rejects that host outright (`CONNECT` → 502, logged as `"policy denial or upstream failure"` in the proxy's own status endpoint), and DNS lookups for `xcamp.xchange.eco`, `app.xchange.eco`, `nox.xchange.eco`, and `founder.xchange.eco` all fail to resolve from this sandbox, while the bare apex `xchange.eco` resolves fine. **This does not prove the domain is broken** — it proves this sandbox's network policy doesn't reach it. Whether that domain is aliased to this Vercel project (Production Domains setting) and whether its DNS/CDN is healthy is `BLOCKED` — needs a human (or a session with unrestricted egress / Vercel dashboard access) to check Vercel → Project → Settings → Domains, and to curl the domain directly.

### Step 4 — server-side verification, independent of any client — `CONFIRMED`

```
$ curl -I https://xcamp-nox-founder-app.vercel.app/
HTTP/2 200
server: Vercel
cache-control: public, max-age=0, must-revalidate
age: 0
x-vercel-cache: MISS
last-modified: Mon, 17 Aug 2026 11:38:19 GMT
```

`age: 0` / `x-vercel-cache: MISS` rules out a stale CDN-edge cache — this request was served fresh, not from edge cache. The HTML references `/assets/index-DNlZZmTi.js`, which dynamically imports `/assets/home-ztH0632w.js`, `/assets/AppShell-s_vuT6OP.js`, `/assets/JournalFlow-dppsIyP2.js`.

**Bundle-hash comparison is inconclusive by itself** — a fresh local build of `origin/main` HEAD (`bun install && bun run build`) produces different hashes (`home-0HoVsAsi.js`, `AppShell-Au5Si2Pz.js`, `JournalFlow-DOaIK_5_.js`). This is expected: esbuild/Rollup's minifier does not guarantee deterministic identifier-naming across separate build runs, so a hash mismatch alone does not prove different source.

**Content-level comparison is decisive.** Both the production chunks and the locally-built chunks were diffed after normalizing hashed filenames (`sed -E 's/[A-Za-z0-9_-]{8}\.js/HASH.js/g'`):

| Chunk                                                    | Local (main HEAD) size | Prod size | Diff after hash-normalization                                                                                                                                                                                                                                                                                                                        |
| -------------------------------------------------------- | ---------------------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `home-*.js` (Companion/EcosystemHomeView, PR #100's fix) | 476,979 B              | 478,799 B | 76 differing lines, **all** confined to minifier-assigned identifier names (e.g. `Gb`→`Kb`, `yL`→`xL`) — every literal string and array is byte-identical, including the PR #100 fix's `["I am your companion, always at your service.","Your project is ready. Are you?","Tap the orb to get started."]` array (no `greetLine` reference in either) |
| `AppShell-*.js` (PR #99 shell-parity territory)          | 56,579 B               | 56,579 B  | **0** differing lines after normalization — identical                                                                                                                                                                                                                                                                                                |
| `JournalFlow-*.js` (PR #98 territory)                    | 31,774 B               | 31,802 B  | 2 differing lines, same minifier-identifier-only pattern                                                                                                                                                                                                                                                                                             |

This is strong evidence that **`https://xcamp-nox-founder-app.vercel.app` is currently serving the exact source of `origin/main` HEAD (`d5b8433`), including all three merged PRs** — not a stale build. The production deployment is not the root cause of "no visible change," at least on this domain.

### Step 5 — root-cause checklist

- **Production Branch = `main`?** `BLOCKED` — no Vercel dashboard/API access in this session to read the project setting directly. Indirect evidence supports it: the PR #100 preview comment shows `"nextCommitStatus":"DEPLOYED"` and the default alias is serving current `main` content (Step 4), which is only possible if Production Branch is in fact `main` and merges auto-deploy.
- **Silent build failure / stale checkout?** `NOT AN ISSUE` on the default alias — ruled out by the content match in Step 4.
- **Missing manual promotion step?** `NOT AN ISSUE` on the default alias, by the same evidence — whatever is live was built from current `main`.
- **CDN/edge cache serving stale asset?** `NOT AN ISSUE` on the default alias — `age: 0`, `x-vercel-cache: MISS` (Step 4).
- **Custom domain (`xcamp.xchange.eco`) misconfigured, wrong alias, or stuck on deprecated `xcamp-foundation` infra?** `BLOCKED` — this is the one open, plausible explanation for "no visible change" that this session cannot rule in or out, because its network policy cannot reach that host. **This is the most likely explanation given everything else checks out clean on the canonical Vercel domain.**

### Step 6/7 — Report

**No fix was applied** — nothing on the default Vercel domain/project was found broken. Root cause is `BLOCKED`, not `FIXED`: the working hypothesis, given every other checkpoint is clean, is that the human tested a custom domain (most likely `xcamp.xchange.eco`, the one hardcoded in source) whose DNS/alias/CDN state this session cannot inspect.

**Precise next action for the human:**

1. In the Vercel dashboard for `xchange-ecosphere/xcamp-nox-founder-app` → Settings → Domains, confirm which domain(s) are attached and that they point at **this** project (not `xcamp-foundation` or a stale project), and that the attached domain is aliased to the current Production deployment (`d5b8433` / the deployment shown "Ready" for the `main` branch).
2. `curl -I` that exact domain directly (not through this sandbox) and compare its `/assets/index-*.js` reference against `index-DNlZZmTi.js` (confirmed current) using the same content-diff method as Step 4, if the hash differs.
3. If the domain is fine and still shows old content, check Settings → Git → Production Branch is `main`, and check the latest Production deployment's build log for the commit SHA it actually pulled.

---

## Part B — Live re-verification of the welcome fix

**`BLOCKED`, environment limitation — not a production-app finding.**

Playwright (Chromium, pre-installed at `/opt/pw-browsers/chromium-1194`) was launched with the session's `HTTPS_PROXY` and `--ignore-certificate-errors`, using the same auth/network-stubbing harness `tests/helpers/liveAuth.ts` already established for exactly this purpose, pointed at `https://xcamp-nox-founder-app.vercel.app/home`. Every attempt (3/3, including with `--disable-quic --disable-http2`, and a `waitUntil: "commit"` bare first-request test) failed with `net::ERR_CONNECTION_RESET` at the very first request — even though plain `curl` to the identical URL from the identical sandbox succeeds every time (Step 4 above). This points at the egress proxy handling Chromium's connection differently from `curl`'s, not at anything wrong with the deployed app.

This mirrors the exact blocker the 2026-08-17 layout audit already documented for Vercel _preview_ URLs (Vercel SSO gate) — except this is a _different_ failure mode (`ERR_CONNECTION_RESET`, not a 302 to `vercel.com/sso-api`) and it hits the **production** default alias, not a preview. The production alias itself is not gated by Vercel SSO (`curl -I` returns the SPA shell directly, no redirect) — the block is specific to this session's browser-automation path through the proxy.

**Secondary evidence in lieu of a live click-through:** the content-diff in Part A Step 4 already confirms the literal fix from PR #100 — the intro overlay's `LINES` array containing only the three static companion lines, with no `greetLine` reference anywhere in the shipped `home-*.js` chunk — is present in the exact bundle the production domain serves right now. This is not a substitute for watching the curtain-dismiss-hero sequence render, but it is direct evidence the fixed source, not the pre-fix source, is what a browser would execute.

**Precise next action for the human:** open `https://xcamp-nox-founder-app.vercel.app/home` in an actual browser (private window), click "Enter the ecosystem instead.", confirm the overlay no longer types a greeting and the hero underneath greets exactly once. Given Part A step 5's most likely explanation, also repeat this on whatever domain was originally reported broken, not just the `.vercel.app` alias.

---

## Summary

| Item                                                                                        | Status                                                                                                      |
| ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| #98/#99/#100 merged into `origin/main`                                                      | `CONFIRMED`                                                                                                 |
| Vercel project identity (`xchange-ecosphere/xcamp-nox-founder-app`, not `xcamp-foundation`) | `CONFIRMED`                                                                                                 |
| Default `.vercel.app` domain serving current `main` HEAD (content-level, all 3 PRs)         | `CONFIRMED`                                                                                                 |
| CDN edge cache serving stale content on default domain                                      | `NOT AN ISSUE`                                                                                              |
| Vercel Production Branch setting / promotion step / build logs                              | `BLOCKED` — needs Vercel dashboard/API access                                                               |
| Custom domain (`xcamp.xchange.eco`) alias + DNS health                                      | `BLOCKED` — needs network access this sandbox doesn't have, or a human check                                |
| Live browser click-through of the welcome fix on production                                 | `BLOCKED` — Chromium-through-proxy connection reset to this host; `curl`-level content evidence substitutes |

Given the two `BLOCKED` items are both about the one thing this session cannot see (anything beyond plain HTTPS `curl` to `*.vercel.app`), **the most actionable next step is a human confirming, in an actual browser, which exact URL they tested** — if it wasn't `xcamp-nox-founder-app.vercel.app` directly, that mismatch is almost certainly the whole story.
