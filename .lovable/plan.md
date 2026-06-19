# App Shell + Project Builder (Backcaster Quick Road)

## Goal
Wrap the app in a collapsible left sidebar with two destinations — **Journal** (existing page) and **Project Builder** (new). Build the Project Builder as a single-page, 5-step Quick Road wizard talking to the live xcampapi backend.

## 1. App Shell with Sidebar
- Add a pathless layout route `src/routes/_app.tsx` rendering the shadcn `SidebarProvider` + `AppSidebar` + a header with `SidebarTrigger`, and `<Outlet />`. Keep the auth redirect (signed-out → `/auth`) here so both pages are gated in one place.
- New `src/components/AppSidebar.tsx` (shadcn `Sidebar collapsible="icon"`): Xcamp logo at top, menu items:
  - **Journal** → `/` (icon `BookText`)
  - **Project Builder** → `/project-builder` (icon `Compass`/`Sparkles`)
  - Active state via `useRouterState` pathname.
  - Sign-out button in the footer.
- Move the current home page under the shell: `src/routes/index.tsx` keeps `/` (Journal + Voice tabs) but its content renders inside the shell. Since TanStack flat routing can't put `index.tsx` under `_app` without renaming, I'll instead keep the shell as a shared `<AppShell>` component wrapping page content (simpler, avoids route-tree churn): both `index.tsx` and `project-builder.tsx` render `<AppShell>...</AppShell>`. The `SidebarProvider` lives inside `AppShell`.
- Remove the per-page auth redirect duplication by putting it in `AppShell`.

## 2. API Layer — `src/lib/backcaster-api.ts`
Typed fetch wrappers for the 7 Quick Road endpoints against `https://xcampapi.xchange.eco/api/v1/backcaster`. Auth bearer token pulled from the existing Supabase session via `supabase.auth.getSession()` (no localStorage hacks needed — Option B-lite using the app's own session).

Functions: `listModes()`, `createSession()`, `interpret()`, `generate()`, `fillNode()`, `materialize()`, `getSession()`. Shared `request()` helper attaches `Authorization: Bearer <token>`, parses JSON, throws typed errors (surfaces 409 specially for materialize). Types: `BackcasterMode`, `OutputTree`, `OutputNode`.

## 3. Quick Road State — `src/hooks/useQuickRoad.ts`
`useReducer` holding the `QuickRoadState` from the brief (step, sessionId, selectedModeId, rawInput, interpretation, outputTree, expandedNodeIds, projectTitleOverride, materializedProjectId, error, loading). `fillNode` appends a child to the matching parent by `id` (no tree replace).

## 4. Route + Steps — `src/routes/project-builder.tsx`
Single page wizard wrapped in `<AppShell>`, with a 5-dot `StepIndicator` at top and warm Quick-Road copy. Step components in `src/components/quickroad/`:
- `StepIndicator.tsx` — 5 dots.
- `ModeSelectStep.tsx` — loads modes; auto-selects lowest `default_depth` active mode; confirm/swap; skip if one mode. Empty state: "Backcaster is unavailable right now."
- `InputStep.tsx` — "What do you want to achieve?" textarea + optional "Any constraints or context?"; submit creates session + calls interpret.
- `InterpretStep.tsx` — editable interpretation textarea; revise/re-interpret or continue; inline error + retry.
- `GenerateStep.tsx` — calls `/generate` (expand_leaves:false); renders only `root_nodes` as `NodeCard`s. Inline error + retry. "Regenerate" requires confirm.
  - `NodeCard.tsx` — badge + title + 2-line description; tap expands to full description + up to 3 children as `ChildChip`s + `+` fill button (depth capped at 2).
  - `ChildChip.tsx` — small child chip.
- `ReviewStep.tsx` — editable project title, objective/note counts; gravity-styled **Create in Xcamp** button with confirmation copy "This creates your project — you can edit it in Xcamp afterwards"; **Save for later** (no-op). Handles 409 → "This project was already created." + deep link.
- `SuccessScreen.tsx` — celebration + deep link `https://xcamp.xchange.eco/app/project/:project_id`.

Excluded per brief: bulk-fill, extend-description, generate-mode, recursive editing, success_criteria/risks rendering, history view.

## 5. Design (Quick Road, warm tone)
Reuse existing skin tokens. Accents: brand teal `hsl(168 72% 42%)`, amber border for open objectives, green for completed, purple badge for AI-generated. Light neutral background (not pure white). Materialise button = solid amber gravity treatment. Gentle copy and transitions throughout.

## Technical notes
- All Backcaster calls run client-side from the browser (the brief targets the external API directly with the user's JWT). No Supabase migrations or server functions needed.
- No changes to Journal/Voice behavior beyond moving them inside the shared `AppShell`.
- Verify build succeeds; implement to the documented contract (no live test).

## Files
- create `src/components/AppShell.tsx`, `src/components/AppSidebar.tsx`
- create `src/lib/backcaster-api.ts`, `src/hooks/useQuickRoad.ts`
- create `src/routes/project-builder.tsx`
- create `src/components/quickroad/{StepIndicator,ModeSelectStep,InputStep,InterpretStep,GenerateStep,NodeCard,ChildChip,ReviewStep,SuccessScreen}.tsx`
- edit `src/routes/index.tsx` (wrap in `AppShell`)
