## What changed

<!-- Describe the smallest coherent change set. Link the issue/spec. -->

## Why

<!-- Explain the user, operational, or maintenance need. -->

## Evidence

### Exact verification commands and real output

<!-- Paste every command actually run, its exit code, and the relevant verbatim output. Do not write “passes” without evidence. -->

```text
$ command
real output
exit code: 0
```

### UI evidence

<!-- For UI changes, attach before/after screenshots, video, or the Playwright artifact. Otherwise write N/A. -->

## Agentic-change hygiene

- [ ] I touched no unrelated files.
- [ ] Generated files (including `src/routeTree.gen.ts`) are committed when changed.
- [ ] No secrets, credentials, `.env` files, or private tokens are committed.
- [ ] No `test.only`, `describe.only`, or other focused tests are committed.
- [ ] New/changed GitHub Actions jobs use only `[self-hosted]` runners.
- [ ] Third-party actions are pinned to full commit SHAs.
- [ ] I inspected `git diff --check` and `git status --short` before committing.

## Known failures / follow-up

<!-- Declare every known failing check, limitation, deferred task, and owner. Use “None” only after verifying. -->
