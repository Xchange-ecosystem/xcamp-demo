## Problem

After clicking Continue, the `/interpret` call succeeds but `InterpretStep` crashes with `Cannot read properties of undefined (reading 'trim')`. `state.interpretation` is `undefined`.

## Root cause

`interpret()` in `src/lib/backcaster-api.ts` assumes the response is `{ interpretation, session_id }`. The real payload is:

```json
{
  "success": true,
  "interpreted": "<json string>",
  "data": {
    "interpretation_paragraph": "…",
    "inferred_goal": "…",
    "suggested_title": "…",
    "suggested_parameters": { "depth": 3 }
  }
}
```

So `result.interpretation` is `undefined`, which is stored into state and later `.trim()`'d → crash.

## Fix

**`src/lib/backcaster-api.ts`** — Rewrite `interpret()` to read the real shape and return a normalized object. Request `unknown`, then resolve the interpretation text from `data.interpretation_paragraph` (fallback to parsing the `interpreted` JSON string, then to `""`). Return `{ interpretation: string; suggestedTitle?: string }`. Guard against a missing `data` object.

**`src/components/quickroad/InputStep.tsx`** — On success, also store the suggested title into `projectTitleOverride` when present (optional polish), and keep storing `interpretation`.

**`src/components/quickroad/InterpretStep.tsx`** — Defensive: use `(state.interpretation ?? "")` for the textarea value and the disabled check so a missing value never crashes.

## Verification

Reload `/project-builder`, enter a goal, click Continue. Confirm the Confirm step shows the interpretation paragraph (no crash), then Create plan → tree generates → Build project works end to end.