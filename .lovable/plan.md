## Problem to solve
Step 3 calls `POST /generate` with a payload shape the Backcaster API no longer accepts. The API explicitly requires `session_id`, `interpreted_input`, and `mode_id`, but the app currently sends `session_id`, `interpretation`, and `mode_id`. This explains the 400 error even though the diagnostics show session and mode IDs exist.

## Plan
1. **Fix the generate payload contract**
   - Update `src/lib/backcaster-api.ts` so `generate()` accepts/sends `interpreted_input` instead of `interpretation`.
   - Keep a defensive compatibility mapping internally so older component calls cannot accidentally omit the required API field.
   - Before sending, validate that `session_id`, `mode_id`, and interpreted text are all non-empty and fail locally with a clear message instead of making a bad API call.

2. **Make Step 3 resilient to session/API state mismatch**
   - Update `GenerateStep` to pass the confirmed interpretation as `interpreted_input`.
   - If local state is missing interpreted text, block generation and send the user back to the confirm step rather than calling `/generate`.
   - Improve diagnostics to show which required generate fields are present/missing, not only shortened IDs.

3. **Add controlled retry behavior for unstable backend responses**
   - Add a small retry helper only for transient failures such as 504/timeouts/network errors.
   - Do **not** retry 400 validation errors; those should surface immediately.
   - Keep retry count low and visible in diagnostics so the UI does not feel stuck.

4. **Improve error reporting for future API contract drift**
   - Keep the raw API error logging, but also include a sanitized payload-field summary in diagnostics.
   - Show a more actionable Step 3 message, e.g. “The generator rejected the request because interpreted_input was missing” instead of the generic interruption state.

5. **Verify the path end-to-end**
   - Re-check the request body construction for `/sessions`, `/interpret`, and `/generate`.
   - Confirm TypeScript compatibility after the change.
   - Use the browser/network signal if available to confirm `/generate` no longer sends the wrong field name.

## Technical details
- Current failing call is in `src/components/quickroad/GenerateStep.tsx` lines 72–77.
- Current API wrapper sends the body in `src/lib/backcaster-api.ts` lines 209–219.
- Root cause is field-name mismatch: `interpretation` vs required `interpreted_input`.
- The 504 errors shown for Vite dependency chunks look separate/transient preview-server loading failures, not the Backcaster API validation error. The Step 3 fix should focus on the 400 first, with transient retry handling for actual `/generate` 504s.