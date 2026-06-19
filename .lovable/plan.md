## Simplify Project Builder into a 4-step flow

Reduce the wizard from 5 steps (Mode → Input → Interpret → Generate → Review → Success) to the 4 you described, and fix the `all.filter is not a function` crash on the way.

### Target flow
1. **Input** — one large goal field → `Continue` → AI interpretation
2. **Confirm** — editable interpreted text (HITL) → `Create plan` → generates tree
3. **Plan** — tree of the plan → `Build project` → creates project in Xcamp
4. **Celebration** — success screen with a `Close` button that returns to the main page (Journal / voice at `/`)

### Changes

**1. Fix the modes crash + remove the Mode step (`src/lib/backcaster-api.ts`)**
- The `/modes` endpoint returns a wrapped object, not a bare array, so `.filter` throws. Normalize `listModes()` to resolve the array from `Array.isArray(res) ? res : res.data ?? res.modes ?? res.results ?? []`.
- Since there's no Mode step anymore, the app still needs a `mode_id` to create a session. Fetch modes silently and auto-pick the gentlest (lowest `default_depth`) active mode — no UI shown.

**2. State + steps (`src/hooks/useQuickRoad.ts`)**
- Change `QuickRoadStep` to `"input" | "interpret" | "generate"`; set `initialState.step` to `"input"`.
- Keep `selectedModeId` (set silently), `interpretation`, `outputTree`, `materializedProjectId`, etc.

**3. Route (`src/routes/project-builder.tsx`)**
- Remove `ModeSelectStep` and `ReviewStep` imports/branches; render only `input`, `interpret`, `generate`, and the success screen.

**4. Step indicator (`src/components/quickroad/StepIndicator.tsx`)**
- Reduce to 3 dots: Input, Confirm, Plan.

**5. Input step (`src/components/quickroad/InputStep.tsx`)**
- Show only the large goal textarea (remove the optional "constraints/context" field per "large input field only").
- On mount, silently call `listModes()` and store the chosen `selectedModeId`; `Continue` creates the session + interprets and advances to `interpret`. Surface a clear error if modes can't load.

**6. Confirm step (`src/components/quickroad/InterpretStep.tsx`)**
- Keep editable interpretation; rename the primary button to `Create plan` (advances to `generate`). Keep the lightweight "Re-interpret" option.

**7. Plan step (`src/components/quickroad/GenerateStep.tsx`)**
- Auto-generates the tree on entry (unchanged), renders `NodeCard`s with add-step.
- Replace the `Review & create` button with `Build project`, which calls `materialize` directly (merging the old Review step's create logic + 409 "already created" handling) and sets `materializedProjectId` to show the celebration screen.
- Delete `ReviewStep.tsx`.

**8. Celebration (`src/components/quickroad/SuccessScreen.tsx`)**
- Keep the celebration visuals and the optional "Open in Xcamp" deep link.
- Replace "Build another" with a primary `Close` button that navigates to `/` (the Journal / voice main page) via `useNavigate`.

### Verification
- Load `/project-builder`: confirm the modes crash is gone and the Input step shows one field.
- Walk the flow Input → Confirm → Plan → Build, confirm the success screen appears and `Close` returns to `/`.
