# xcamp-nox-founder-app

> **Superseded.** This repo is superseded by [`xcamp-app`](https://github.com/Xchange-ecosystem/xcamp-app), which carries this repo's full commit history forward as of 2026-09-13. New development happens there — nothing here has been deleted or archived yet (tracked separately as its own cleanup step).

## Updating vendored SDK

`@xchange/companion`, `@xchange/client`, and `@xchange/ui` are vendored under `vendor/` from their respective source repos.

When xcamp-sdk or xcamp-designsystem changes are needed:

```sh
cp -r /path/to/xcamp-sdk/packages/companion/src/* vendor/companion/src/
cp -r /path/to/xcamp-sdk/packages/client/src/* vendor/client/src/
cp -r /path/to/xcamp-designsystem/src/* vendor/ui/src/
git add vendor/
git commit -m "chore: update vendored SDK"
```
