# CI, security, and deployment operations

This repository uses three GitHub Actions workflows, all on organization-level self-hosted runners:

- **CI**: hard repository guards, build, generated-route drift, and Playwright E2E gates, plus ratcheted formatting, linting, and TypeScript debt reports.
- **Security**: TruffleHog OSS secret scanning, Bun dependency audit, and immutable action-reference enforcement.
- **CD**: release artifact creation and an opt-in Vercel production deployment with a post-deploy smoke test.

Vercel Git integration is the default deployment authority. Keep `ENABLE_VERCEL_DEPLOY` unset unless the workflow should replace that behavior for production deploys.

## Hard gates and ratcheted quality debt

CI distinguishes regressions from debt that already exists on `main`:

| Check                                           | Policy today               | Enforcement                                                                                                 |
| ----------------------------------------------- | -------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Repository guards                               | Hard gate                  | Any violation fails `guards`.                                                                               |
| Production build and generated route-tree drift | Hard gate                  | Any failure fails `verify` (`Build`).                                                                       |
| Playwright E2E                                  | Hard known-failure ratchet | New failures, missing tests, overdue reviews, and policy-specific signature/recovery violations fail `e2e`. |
| Security scans and dependency/action policy     | Hard gates                 | Any failure fails its Security workflow job; findings are not suppressed.                                   |
| Prettier                                        | Soft report, hard ratchet  | The report step may fail, but more than **165 unformatted files** fails the final ratchet.                  |
| ESLint errors                                   | Soft report, hard ratchet  | The report step may fail, but more than **10,819 errors** fails the final ratchet.                          |
| ESLint warnings                                 | Soft report, hard ratchet  | More than **44 warnings** fails the final ratchet.                                                          |
| TypeScript                                      | Soft report, hard ratchet  | The report step may fail, but more than **14 errors** fails the final ratchet.                              |

The exact baselines live in `.github/quality-baseline.json`; `.github/scripts/quality-ratchet.sh` measures current results using Prettier check output, ESLint's JSON formatter, and `tsc --noEmit`. Existing debt is visible in separate `quality` steps, while the final ratchet step is blocking. Debt may shrink, never grow.

When a change reduces a count, lower the matching value in `.github/quality-baseline.json` in the same PR. Never raise a baseline to make CI pass. Run `bash .github/scripts/quality-ratchet.sh` locally and commit the lower number after verifying the new count.

When a count reaches zero, promote that gate to hard:

1. In `.github/workflows/ci.yml`, find the matching `Report formatting debt`, `Report lint debt`, or `Report TypeScript debt` step under `jobs.quality` and remove `continue-on-error: true`.
2. Remove that metric from `.github/quality-baseline.json` and from the baseline parsing, row construction, and comparison logic in `.github/scripts/quality-ratchet.sh`. ESLint errors and warnings share one command; promote the lint step only when both are zero.
3. Update this table, run the workflow checks locally, and keep `quality` in the `ci-ok` dependency/result assertions.

### E2E known-failures ratchet

`.github/e2e-known-failures.txt` records the exact Playwright identity (`file` plus full test title), expected error signature, date added, 90-day `REVIEW-BY` deadline, and a semantic classification. This is not a skip list: Playwright still runs every test and writes JUnit to `playwright-report/results.xml`. The blocking `.github/scripts/e2e-gate.sh` applies these policies:

| Classification  | Passing observation                                                                   | Failing observation                                                                                                                            |
| --------------- | ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `ALWAYS-FAILS`  | **FAIL** the gate and print the exact line to delete; this is a recovered test.       | Pass only when the JUnit failure signature exactly matches the recorded signature; a changed signature **fails**.                              |
| `FLAKY`         | Pass the gate and emit a `::notice::`; the summary's **Flaky** column records `PASS`. | Pass and emit a `::notice::` for the recorded signature. A varied signature emits `::warning::` rather than failing because flaky modes vary.  |
| `ENV-SENSITIVE` | Pass and emit a `::notice::`; this is the expected developer-host outcome.            | Pass and emit a `::notice::`; a varied signature emits `::warning::`. This classification tracks a CI-only failure mode pending investigation. |

`FLAKY` means the outcome varies across repeated observations in the same environment. `ENV-SENSITIVE` means the test is expected to fail on the CI runner and pass on a developer machine; its underlying cause is still unidentified and must be investigated. Both remain visible, tracked debt; neither is permission to hide a new failure. Every classification still fails when its testcase is absent from the report or its `REVIEW-BY` date is overdue. Unknown failures always block.

The list may **only shrink** after bootstrap. Never add, mutate, or reclassify an entry merely to make CI pass. Fix the underlying test or application behavior instead. When an `ALWAYS-FAILS` test recovers, copy the exact line printed by the gate, delete that line from `.github/e2e-known-failures.txt`, and commit the deletion with the fix. Remove `FLAKY` or `ENV-SENSITIVE` entries only after repeated evidence shows that the tracked instability is gone; a tolerated pass alone does not prove that the underlying debt is fixed. Every entry must be reviewed by its deadline or the gate fails.

Run the ratchet locally after a full E2E run:

```bash
CI=1 bun run test:e2e || true
bash .github/scripts/e2e-gate.sh
```

The first command is allowed to return non-zero only so the blocking second command can inspect its real JUnit report. Do not use the Playwright exit code alone while known failures remain.

To inspect a copied report or allowlist without altering checked-in evidence:

```bash
E2E_RESULTS_XML=/tmp/results.xml E2E_ALLOWLIST=/tmp/allowlist.txt \
  bash .github/scripts/e2e-gate.sh
```

## Self-hosted runner requirements

Every workflow job deliberately uses only the `self-hosted` label. The organization has **5 org-level self-hosted runners** available to this repository through an organization runner group. Repository administrators must keep **Settings → Actions → Runner groups** access enabled for that group. The available token lacks `admin:org`, so exact runner labels, OS, and architecture could not be verified through the organization API; workflows intentionally target only the base `self-hosted` label rather than guessing qualifiers that could make jobs queue forever.

If the existing organization runner group must be replaced or expanded:

1. In GitHub, open **Settings → Actions → Runners → New self-hosted runner** (repository or organization scope).
2. Select Linux and run GitHub's generated download/configuration commands with a short-lived registration token.
3. Install the runner as a dedicated, unprivileged service account and enable its service.
4. Confirm `self-hosted` appears in its labels and that the runner is online.
5. Restrict private-repository runner groups to this repository where possible. Fork PR code is not run: CI uses `pull_request`, never `pull_request_target`.

Required tools:

- GitHub Actions Runner 2.327.1 or newer (required by the Node.js 24 action majors).
- `bash`, Git, curl, Python 3, GNU coreutils, `jq`, and Docker (TruffleHog runs its OSS container).
- Bun 1.3.11 or newer. The setup composite compares the installed semantic version and installs pinned Bun 1.3.11 when Bun is absent, older, or reports an invalid version.
- Network egress to GitHub, Bun's package registry, Playwright browser downloads, GHCR, Supabase/Vox stubs, and optionally Vercel.
- Enough free disk for dependencies, Chromium, build output, and artifacts.

### E2E runner requirements

`.github/scripts/ensure-playwright-deps.sh` installs Chromium and performs a real headless launch before E2E runs. It is fail-closed and works in these layers:

1. Launch the freshly installed browser and exit immediately when the host is ready.
2. If the account is root or has passwordless sudo, run Playwright's supported `--with-deps` installer and launch again.
3. Otherwise, inspect the browser with `ldd`, map the exact missing libraries to the detected `apt`, `dnf`, `apk`, or `pacman` packages, download without installing, extract under `$RUNNER_TEMP/pw-sysdeps`, export `LD_LIBRARY_PATH` through `$GITHUB_ENV`, and launch again. The extracted prefix is cached, keyed by the Playwright lock/script and its resolved missing-library set; a cache hit is always re-probed.
4. If Chromium still cannot launch, emit a GitHub `::error::` containing the exact missing libraries, package family, package list, and admin commands, then exit non-zero.

The permanent runner-image fix is a one-time admin command from a checkout with dependencies installed:

```bash
sudo bunx playwright install --with-deps chromium
# Equivalent when npm/npx is the managed toolchain:
sudo npx playwright install-deps chromium
```

Once the image has those libraries, layer 1 succeeds and all privileged/userspace fallbacks are skipped. Package names vary by distribution (for example, newer Debian/Ubuntu may use `libasound2t64` rather than `libasound2`). To debug, run `bash .github/scripts/ensure-playwright-deps.sh`, inspect the printed `ldd` library names and probe log path, then run `ldd` on the reported `chrome-headless-shell` executable. The script never changes the developer host unless root or passwordless sudo is already available; without privilege it writes only to the temporary userspace prefix.

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

When the variable is absent or not `true`, `deploy-vercel` is skipped and the release summary explains that Vercel Git integration remains authoritative. A push or manual dispatch of `main` may deploy to production; a manual dispatch of any other ref is forced to a Vercel preview and can never receive `--prod`. When enabled but a secret is absent, deployment steps skip cleanly and name the missing configuration in the job summary. The smoke job runs only when deployment emitted a real URL.

The generic `release-dist-<sha>` artifact records the normal Vite build but is not Vercel's deployable format. The deploy job uploads `vercel-output-<sha>` from `.vercel/output/` immediately after `vercel build` and deploys that same local output with `--prebuilt`; this is the artifact that corresponds to the deployed bytes. All pull, build, and deploy commands use the workflow-level `VERCEL_CLI_VERSION` pin. To upgrade it, review the Vercel CLI release notes, change that single value, and validate both preview and production argument paths.

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
bash .github/scripts/ensure-playwright-deps.sh
CI=1 bun run test:e2e
```

Dependency and action security gates:

```bash
bash .github/scripts/dependency-audit.sh
# TruffleHog full-history equivalent (requires Docker):
docker run --rm -v "$PWD:/repo:ro" ghcr.io/trufflesecurity/trufflehog:3.97.4 \
  git file:///repo --branch HEAD --fail --no-update --results=verified,unknown
```

The dependency audit can legitimately take about eight minutes on the self-hosted runners. Each attempt therefore has a 15-minute bound, with at most two attempts and one 5-second backoff; the job allows 35 minutes (30m05s plus setup/cleanup headroom). Only a timeout or a non-zero command with empty/network-error output is retried. Bun diagnostics may precede the JSON, so the parser locates the first object line and parses through EOF. Any parseable response is evaluated exactly once: stale/expired suppressions or unallowlisted high/critical advisories hard-fail, while moderate/low advisories remain visible below the configured `high` threshold.

TruffleHog is AGPL-3.0 OSS and its action/container are free to run for private organization repositories; no TruffleHog license key is required. PR scans explicitly compare the checked-out base and head SHAs. Push, scheduled, and manual scans use the complete checked-out Git history rather than the action's narrower push-event default.

## Workflow maintenance

All external actions are pinned to immutable 40-character commit SHAs. They must also target the newest runtime supported by GitHub Actions Runner, currently Node.js 24. Node.js 26 is not a valid Actions runtime yet; do not invent or require it. Dependabot's `github-actions` updater will surface future action and runtime bumps while retaining release comments. Never replace a SHA with a mutable tag or branch. The security workflow enforces pinning; local actions under `./.github/actions/` are the only exemption.

Both `bun.lock` and `package-lock.json` remain authoritative. Dependency-bearing `package.json` changes must update both lockfiles. Script-only changes do not alter lockfile dependency metadata.
