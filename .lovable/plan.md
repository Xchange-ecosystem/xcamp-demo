## Problem

Clicking **Continue** only shows "Still getting ready — please try again in a moment." The `/modes` request succeeds (200), but no mode ever gets selected, so `submit()` bails on the `!state.selectedModeId` guard.

## Root cause

The backend returns each mode with a `status: "active"` field and **no `is_active` field**. But `InputStep.tsx` selects the mode with:

```ts
const active = all.filter((m) => m.is_active); // always [] — is_active is undefined
```

So `active` is empty, `selectedModeId` stays `null`, and Continue can never proceed.

## Fix

**1. `src/lib/backcaster-api.ts`** — Update the `BackcasterMode` interface to match the real payload: replace `is_active: boolean` with `status: string` (and add `slug`/`category`/`road` as optional fields for clarity). Optionally narrow to `road: "quick"` modes since those are the relevant ones.

**2. `src/components/quickroad/InputStep.tsx`** — Change the mode auto-pick to filter on `status === "active"` instead of `is_active`:

```ts
const active = all.filter((m) => m.status === "active");
```

Keep the gentlest-mode sort by `default_depth`. Add a clearer fallback error if `all` is non-empty but none are active.

## Verification

Reload `/project-builder`, type a goal, click **Continue**. Confirm it advances to the Confirm (interpret) step instead of showing "Still getting ready". Walk the full flow (Confirm → Plan → Build) to ensure the selected mode id flows through `createSession`/`interpret`/`generate`/`materialize`.