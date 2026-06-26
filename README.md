# xcamp-nox-founder-app

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
