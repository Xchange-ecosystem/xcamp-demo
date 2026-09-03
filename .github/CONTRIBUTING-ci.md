# CI, security, and deployment operations

This repository uses three GitHub Actions workflows, all on organization-level self-hosted runners:

- **CI**: hard repository guards, build, generated-route drift, and Playwright E2E gates, plus ratcheted formatting, linting, and TypeScript debt reports.
- **Security**: TruffleHog OSS secret scanning, Bun dependency audit, and immutable action-reference enforcement.
- **CD**: release artifact creation and an opt-in Vercel production deployment with a post-deploy smoke test.

Vercel Git integration is the default deployment authority. Keep `ENABLE_VERCEL_DEPLOY` unset unless the workflow should replace that behavior for production deploys.

## Hard gates and ratcheted quality debt

CI distinguishes regressions from debt that already exists on `main`:

| Check                                           | Policy today              | Enforcement                                                                                |
| ----------------------------------------------- | ------------------------- | ------------------------------------------------------------------------------------------ |
| Repository guards                               | Hard gate                 | Any violation fails `guards`.                                                              |
| Production build and generated route-tree drift | Hard gate                 | Any failure fails `verify` (`Build`).                                                      |
| Playwright E2E                                  | Hard gate                 | Any failure fails `e2e`.                                                                   |
| Security scans and dependency/action policy     | Hard gates                | Any failure fails its Security workflow job; findings are not suppressed.                  |
| Prettier                                        | Soft report, hard ratchet | The report step may fail, but more than **165 unformatted files** fails the final ratchet. |
| ESLint errors                                   | Soft report, hard ratchet | The report step may fail, but more than **10,819 errors** fails the final ratchet.         |
| ESLint warnings                                 | Soft report, hard ratchet | More than **44 warnings** fails the final ratchet.                                         |
| TypeScript                                      | Soft report, hard ratchet | The report step may fail, but more than **14 errors** fails the final ratchet.             |

The exact baselines live in `.github/quality-baseline.json`; `.github/scripts/quality-ratchet.sh` measures current results using Prettier check output, ESLint's JSON formatter, and `tsc --noEmit`. Existing debt is visible in separate `quality` steps, while the final ratchet step is blocking. Debt may shrink, never grow.

When a change reduces a count, lower the matching value in `.github/quality-baseline.json` in the same PR. Never raise a baseline to make CI pass. Run `bash .github/scripts/quality-ratchet.sh` locally and commit the lower number after verifying the new count.

When a count reaches zero, promote that gate to hard:

1. In `.github/workflows/ci.yml`, find the matching `Report formatting debt`, `Report lint debt`, or `Report TypeScript debt` step under `jobs.quality` and remove `continue-on-error: true`.
2. Remove that metric from `.github/quality-baseline.json` and from the baseline parsing, row construction, and comparison logic in `.github/scripts/quality-ratchet.sh`. ESLint errors and warnings share one command; promote the lint step only when both are zero.
3. Update this table, run the workflow checks locally, and keep `quality` in the `ci-ok` dependency/result assertions.

## Self-hosted runner requirements

Every workflow job deliberately uses only the `self-hosted` label. The organization has **5 org-level self-hosted runners** available to this repository through an organization runner group. Repository administrators must keep **Settings → Actions → Runner groups** access enabled for that group. The available token lacks `admin:org`, so exact runner labels, OS, and architecture could not be verified through the organization API; workflows intentionally target only the base `self-hosted` label rather than guessing qualifiers that could make jobs queue forever.

If the existing organization runner group must be replaced or expanded:

1. In GitHub, open **Settings → Actions → Runners → New self-hosted runner** (repository or organization scope).
2. Select Linux and run GitHub's generated download/configuration commands with a short-lived registration token.
3. Install the runner as a dedicated, unprivileged service account and enable its service.
4. Confirm `self-hosted` appears in its labels and that the runner is online.
5. Restrict private-repository runner groups to this repository where possible. Fork PR code is not run: CI uses `pull_request`, never `pull_request_target`.

Required tools:

- A currently supported GitHub Actions Runner release.
- `bash`, Git, curl, Python 3, GNU coreutils, `jq`, and Docker (TruffleHog runs its OSS container).
- Bun 1.3.11 is preferred. The setup composite uses an existing Bun or installs 1.3.11 with `oven-sh/setup-bun`.
- Network egress to GitHub, Bun's package registry, Playwright browser downloads, GHCR, Supabase/Vox stubs, and optionally Vercel.
- Enough free disk for dependencies, Chromium, build output, and artifacts.

Playwright installs Chromium without `--with-deps`, so install browser system libraries once on the runner image. On current Debian/Ubuntu runners these commonly include:

```text
libasound2t64 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdbus-1-3
libdrm2 libgbm1 libglib2.0-0 libnspr4 libnss3 libpango-1.0-0
libx11-6 libxcb1 libxcomposite1 libxdamage1 libxext6 libxfixes3
libxkbcommon0 libxrandr2 fonts-noto-color-emoji
```

Package names differ by distribution (for example, older Ubuntu uses `libasound2`). Validate the image with `bunx playwright install chromium` and `bunx playwright test --list`; if browser launch reports a missing shared object, install the corresponding distribution package in the runner image rather than granting workflow jobs `sudo`.

Self-hosted workspaces are reused. `actions/checkout` is configured with `clean: true` and `persist-credentials: false`; jobs must not rely on files from earlier runs. Periodically remove abandoned Actions work directories, old Docker images, Playwright caches, and Bun caches under the runner service account, while never deleting an active job's workspace.

## Secrets and variables

### Optional E2E repository secrets

The tests stub application network traffic and can boot with CI-safe placeholders. These secrets override placeholders when present:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_VOX_API_URL`
- `VITE_BACKEND_URL`
- `VITE_BACKEND_API_URL`

Only `VITE_` values are exposed to the browser. Never put server credentials in them.

### Opt-in Vercel deployment

Set all of the following before enabling workflow deployment:

- Repository variable `ENABLE_VERCEL_DEPLOY` = `true`
- Repository secret `VERCEL_TOKEN`
- Repository secret `VERCEL_ORG_ID`
- Repository secret `VERCEL_PROJECT_ID`

When the variable is absent or not `true`, `deploy-vercel` is skipped and the release summary explains that Vercel Git integration remains authoritative. When enabled but a secret is absent, deployment steps skip cleanly and name the missing configuration in the job summary. The smoke job runs only when deployment emitted a real URL.

## SECURITY: historical `.env` leak requires remediation

Git history contains a previously committed `.env` in commits `8f00f17ea62ad4308fdc6bf64e77f99c51ad4a48` and `b428d78b12e46298e403f43fc3b6d10966dae336`, authored by `gpt-engineer-app[bot]`; the file was deleted later in `584f3fb`. Treat the exposed **OpenAI API key** and **Supabase keys** as compromised. Do not copy their values into issues, logs, pull requests, or documentation.

The Security workflow intentionally runs TruffleHog over full history on push, schedule, and manual dispatch. It **will fail** on those events until both required remediations are complete:

1. Rotate/revoke the exposed OpenAI API key and Supabase keys, then update legitimate secret stores with replacement credentials.
2. After coordinating repository downtime and backups, purge the historical `.env` blobs with `git-filter-repo`, verify the rewritten history, and force-push all affected branches/tags. Every collaborator must then re-clone or carefully reset onto the rewritten history.

This finding is intentionally not suppressed: deleting `.env` in a later commit does not remove credentials from earlier Git objects, and history rewriting without credential rotation does not make already exposed credentials safe.

## Recommended branch protection

Protect `main` and require pull requests. Require the single stable status check **`ci-ok`**. That aggregator fails unless repository guards, build verification, E2E, and the quality debt ratchet all succeed. Also require the **Security / Secret scan**, **Security / Dependency audit**, and **Security / Action reference pinning** checks so security remains a hard merge gate. Require branches to be up to date or use GitHub's merge queue (`merge_group` is supported by CI). Restrict force pushes and branch deletion.

## Run gates locally

From a clean worktree with Bun 1.3.11:

```bash
bun install --frozen-lockfile
bash .github/scripts/repo-guards.sh
bun run format:check
bun run lint
bun run typecheck
bash .github/scripts/quality-ratchet.sh
bun run build
git diff --exit-code -- src/routeTree.gen.ts
CI=1 bunx playwright test --list
```

To run full E2E, create an ignored `.env` from `.env.example` with non-empty Supabase URL/key values, then install and test:

```bash
bunx playwright install chromium
CI=1 bun run test:e2e
```

Dependency and action security gates:

```bash
bash .github/scripts/dependency-audit.sh
# TruffleHog full-history equivalent (requires Docker):
docker run --rm -v "$PWD:/repo:ro" ghcr.io/trufflesecurity/trufflehog:3.97.4 \
  git file:///repo --branch HEAD --fail --no-update --results=verified,unknown
```

TruffleHog is AGPL-3.0 OSS and its action/container are free to run for private organization repositories; no TruffleHog license key is required. PR scans explicitly compare the checked-out base and head SHAs. Push, scheduled, and manual scans use the complete checked-out Git history rather than the action's narrower push-event default.

## Workflow maintenance

All external actions are pinned to immutable 40-character commit SHAs. Dependabot's `github-actions` updater proposes SHA changes while retaining release comments. Never replace a SHA with a mutable tag or branch. The security workflow enforces this policy; local actions under `./.github/actions/` are the only exemption.

Both `bun.lock` and `package-lock.json` remain authoritative. Dependency-bearing `package.json` changes must update both lockfiles. Script-only changes do not alter lockfile dependency metadata.
