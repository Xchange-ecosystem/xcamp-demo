## Goal
Surface the real reason behind the `POST /backcaster/generate` **400 Bad Request** so we can fix it. Right now the actual error is hidden — the UI shows `[object Object]` and the diagnostics show `last error: [object Object]`.

## Root cause analysis

**The "[object Object]" is the real blocker.** In `src/lib/backcaster-api.ts`, the `request()` helper extracts errors like this:

```ts
const body = await res.json();
if (body?.message) message = body.message;     // <- if message is an OBJECT, this breaks
else if (body?.error) message = body.error;
```

The xcampapi `/generate` endpoint returns a **structured** 400 body (e.g. FastAPI-style `{ detail: [...] }`, or `{ message: { field: "..." } }`, or `{ errors: {...} }`). When `message`/`error` is an object/array, passing it to `new Error(message)` coerces it to the string `"[object Object]"`. So the validation detail (which field/value the API rejected) is being thrown away before it ever reaches the screen.

We can't fix the 400 itself until we can read what the API is actually complaining about.

**The other console messages are noise, not bugs:**
- `Checking for app updates` — Lovable's own preview script (`lovable.js`).
- `Unrecognized feature: 'vr' / 'ambient-light-sensor' / 'battery'` — iframe `allow=` attribute warnings from the Lovable preview wrapper, not our code.
- `/cdn-cgi/image/.../...?X-Goog-Expires=... 404` — an expired Google Cloud signed URL for an uploaded image (the signed link timed out). Unrelated to Backcaster.

None of these require code changes.

## Plan

### 1. Make error extraction reveal the real message (`src/lib/backcaster-api.ts`)
Rewrite the error branch of `request()` to:
- Read the body as text first, then attempt `JSON.parse`.
- Extract a human message checking, in order: `detail` (string, or array of `{msg/loc}` joined), `message`, `error`, `errors` — and `JSON.stringify` any remaining object instead of letting it become `"[object Object]"`.
- Fall back to the raw text body, then to `Request failed (status)`.
- Temporarily `console.error("[backcaster] <path> <status>", rawText)` so the exact 400 payload is visible in the console on the next run.

This guarantees the diagnostics panel and the toast show the actual validation reason (e.g. "interpretation is required", "mode_id not found", "session not in interpreted state").

### 2. Read the revealed error and fix the payload
Once the true message is visible, apply the targeted fix in `generate()` / the request body. Likely candidates (to confirm from the real message):
- `interpretation` is empty or the API expects a different field name (e.g. `interpretation_paragraph`).
- Session must be in `interpreted` status before `/generate` is allowed (sequencing issue).
- `mode_id` mismatch or `expand_leaves` typing.

### 3. Verify
Re-run the Project Builder flow, confirm the console prints the raw 400 body, confirm the corrected payload returns a tree, and remove the temporary `console.error` once resolved (or downgrade to a guarded debug log).

## Out of scope
The "app updates", "Unrecognized feature", and expired signed-URL 404 messages — these originate from the Lovable preview wrapper / an expired upload link, not the application code.

## Technical detail
Only `src/lib/backcaster-api.ts` changes in step 1. Step 2 may touch the `generate()` body and possibly the step sequencing in `GenerateStep.tsx` / `useQuickRoad.ts`, depending on what the 400 body reveals.