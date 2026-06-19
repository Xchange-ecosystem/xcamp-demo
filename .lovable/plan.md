## What is actually happening

The captured network traffic shows the backend is working through interpretation:

1. `GET /backcaster/modes` succeeds and returns the BPMO mode (`slug: bpmo-proof-v1`).
2. `POST /backcaster/sessions` succeeds with `201 Created`.
3. The response shape is:

```text
{ success: true, data: { id: "11c36b99-...", ... } }
```

4. The frontend currently treats the response as if it were the session object directly:

```text
session.id
```

But because the real ID is at:

```text
session.data.id
```

`session.id` is `undefined`.

5. `POST /backcaster/interpret` still runs and succeeds, but the app patches:

```text
sessionId: undefined
step: "interpret"
```

6. When the user clicks `Create plan`, step 3 mounts `GenerateStep`, but `runGenerate()` immediately exits here:

```text
if (!state.sessionId || !state.selectedModeId) return;
```

So no `/generate` call happens, no animation appears, no status appears, no error appears, and no `/materialize` can ever run. This matches your screenshot: the app is on the Plan step with an empty bordered container.

## Bug-fix setup to expose the workflow break

### 1. Normalize backend wrapper responses
Update `src/lib/backcaster-api.ts` so every API wrapper unwraps `{ success, data }` consistently.

- `createSession()` should return the actual session object from `data`, not the wrapper.
- `getSession()` should do the same if that endpoint also wraps responses.
- Keep existing interpretation parsing because `/interpret` returns both `interpreted` and `data`.
- Add hard validation: if a required ID is missing, throw a visible `BackcasterError` instead of silently passing `undefined` into app state.

### 2. Prevent silent transitions into broken states
Update `src/components/quickroad/InputStep.tsx`:

- After `createSession()`, verify a real `session.id` exists before calling `interpret()`.
- If not, show a clear error in the form and do not advance to Confirm.

Update `src/components/quickroad/InterpretStep.tsx`:

- Disable `Create plan` unless both `state.interpretation` and `state.sessionId` exist.
- If `sessionId` is missing, show a visible diagnostic error instead of letting Plan render blank.

Update `src/components/quickroad/GenerateStep.tsx`:

- Replace the current silent early return with a visible error panel when `sessionId` or `selectedModeId` is missing.
- This guarantees the Plan step never renders an empty container again.

### 3. Add an on-screen workflow diagnostics panel
Add a compact debug/status strip inside the Project Builder card while this workflow is being fixed:

```text
Mode loaded → Session created → Interpreted → Generating tree → Tree ready → Materializing → Project created
```

Each stage should show one of:

```text
waiting / running / ok / failed / skipped
```

This should display the key IDs safely:

```text
mode_id
session_id
project_id
last endpoint
last error
```

No bearer tokens, raw auth headers, or secrets should be shown.

### 4. Wire status updates around every async call
Track workflow status in `useQuickRoad` or local step state:

- modes request start/success/failure
- session creation start/success/failure
- interpretation start/success/failure
- generation start/success/failure
- materialization start/success/failure

Use this status both for UI diagnostics and to decide what error to show below the network animation.

### 5. Confirm materialize is only expected after generation
Clarify the user flow in the UI:

- Step 2 → Step 3 should call `/generate`, not `/materialize`.
- `/materialize` only runs after the generated accordion tree is visible and the user clicks `Build project`.
- If the desired simplified version should automatically materialize immediately after generation, implement that explicitly after the tree succeeds.

### 6. Verification checklist
After implementation, verify via network/devtools that one complete successful path produces:

```text
GET  /modes
POST /sessions
POST /interpret
POST /generate
POST /sessions/{id}/materialize   only after Build project
```

And verify failure cases show in the UI instead of a blank container:

- missing mode
- missing session id
- interpret failure
- generate failure
- materialize failure