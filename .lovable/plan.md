# Port the Project Navigator (Browser view)

Bring the column-based "browser" Navigator from **Xcamp Foundation** into this app: a resizable two-pane view (Objectives on the left, that objective's Tasks on the right) plus an "Unassigned" bucket. Add it as a new page with a sidebar menu item, a global project selector in the sidebar, and make objectives and tasks open in a note-style detail editor. Everything is adapted to this app's stack (TanStack Router, `useAuth`/`XcampUser`, skin CSS variables, `NoteEditor`) and works inside the central container and on mobile.

## What the user will see

- A new **Navigator** item in the sidebar.
- A **project selector** at the top of the sidebar; the chosen project is the app's "active project" and drives the Navigator (and is available to other pages later).
- On the Navigator page: an **Objectives** column and a **Tasks** column.
  - Pick an objective → its tasks appear; pick **Unassigned** → project tasks with no objective.
  - Add objectives and tasks inline from each column's footer input.
  - Check off tasks to mark done.
  - Click any objective or task → opens a **detail editor** (same look/behavior as the Notes editor) to view/edit details.
- On mobile: a single column at a time — Objectives, then Tasks, then the editor — with back navigation, matching how `Journal` collapses to one column.

## Technical approach

### 1. Active-project context (global)
- New `src/contexts/active-project.tsx`: `ActiveProjectProvider` + `useActiveProject()` holding `{ activeProjectId, setActiveProjectId }`, persisted to `localStorage`. Defaults to the first project from `listProjects`.
- Wrap the app once (in `src/routes/__root.tsx`, alongside existing providers) so any page can read the active project.

### 2. Sidebar project selector + menu item (`src/components/AppSidebar.tsx`)
- Add a project `<select>` (skin-styled) below the header, fed by a `useQuery(['projects', tenantId], () => listProjects(user))`, bound to `useActiveProject()`. Collapses gracefully when the sidebar is in icon mode (show an icon-only affordance).
- Add `{ title: "navigator", url: "/navigator", icon: Compass, labelKey: "nav.navigator" }` to `items`. Add the `nav.navigator` label to `src/lib/i18n.ts`.

### 3. Navigator data layer (`src/lib/navigator-api.ts`)
Reimplement the source `data.ts` hooks using this app's `supabase` client + `XcampUser` (no `useIdentity`, no `objectivesService`):
- `listObjectivesWithCounts(user, projectId)` — objectives for the project plus task counts (`objective_notes` + `notes.done`).
- `listObjectiveTasks(objectiveId)` and `listUnassignedProjectTasks(projectId)` — mirror source logic via `objective_notes` / `project_notes`.
- `createObjective`, `updateObjective`, `createTaskNote`, `toggleNoteDone` — writing `owner_central_id`/`tenant_id` from `XcampUser` (consistent with `xcamp-api.ts`).
- Expose as React Query hooks so columns refresh on mutation.

### 4. Navigator components (`src/components/navigator/`)
- `NavigatorBrowser.tsx` — the two-pane layout using this app's `@/components/ui/resizable` (already wraps `react-resizable-panels`); mobile single-column switching driven by `useIsMobile()` and selection/editing state, same pattern as `Journal`.
- `ObjectivesColumn.tsx` and `TasksColumn.tsx` — ported from `NavigatorListView`, restyled with skin variables (`var(--skin-*)`) and existing button classes (`x-btn-primary`, `x-input`) instead of `clsx`/raw Tailwind.
- Selecting an objective or task sets an `editing` target that renders the detail editor (replaces the source `DetailPanelProvider`).

### 5. Note-style detail editor for objectives and tasks
- **Tasks** reuse `NoteEditor` directly (`note_type` "task").
- **Objectives**: add `ObjectiveEditor.tsx` styled to match `NoteEditor` (title, description/body, status), saving via `updateObjective`. Opens in the same right-hand/editor slot so objectives and tasks both "open in a view like notes."

### 6. Route + page (`src/routes/navigator.tsx`)
- `createFileRoute("/navigator")` with `head()` meta (title/description), rendering `<AppShell><NavigatorBrowser/></AppShell>`.
- Reads `useActiveProject()`; if no project selected, show a friendly "Select a project" empty state. Constrains to the central container width and full-height like other pages.

## Notes / assumptions
- Browser (column) view only — the graph/network view is intentionally not ported.
- Reuses existing tables (`objectives`, `notes`, `objective_notes`, `project_notes`); no schema changes expected. If `project_notes` or an objective `status`/`description` column is missing, I'll confirm before adding a migration.
- No new design direction — strictly reuses the current skin tokens and component styles.
