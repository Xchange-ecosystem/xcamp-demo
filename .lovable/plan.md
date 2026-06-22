## Problem

The Navigator data layer works correctly (14 projects load), but:

1. The active project defaults to the first project alphabetically, which is the system `__general__` project (sorts first due to underscores). It only has a system catch-all objective and no real tasks — so the view looks empty.
2. The only project switcher is in the sidebar. On mobile that sidebar is a hidden drawer, and the Navigator header shows the project name only as static text. There is no easy way to switch projects from the page.

## Changes

### 1. Hide the system project — `src/lib/xcamp-api.ts`
In `listProjects`, filter out the system project whose title is `__general__` so it never appears in any selector. Real projects become the only options.

### 2. Default to a real project — `src/contexts/active-project.tsx` / `src/components/AppSidebar.tsx`
The existing default-to-first-project effect already picks `projects[0]`. Once `__general__` is filtered out, the default becomes the first real project. Also clear a stale stored `activeProjectId` if it no longer exists in the filtered list, so anyone currently stuck on `__general__` is moved to a real project.

### 3. Add an in-page project selector — `src/components/navigator/NavigatorBrowser.tsx`
Replace the static project-name text in the Navigator header with a compact `<select>` (skin-styled, same as the sidebar one) bound to `useActiveProject()`. This works in the central container on desktop and on mobile, so users can switch projects without opening the sidebar. Selecting a project resets the current objective/task selection.

### 4. Hide the system objective (optional cleanup)
In the objectives column, filter out the `__general__` system objective so the column only shows real objectives for the selected project.

## Technical notes

- `__general__` is identified by its title string; filtering happens in the data/UI layer only — no schema or RLS changes.
- The selector reuses the existing `x-input` styling and the `useActiveProject` context already wired through the app.
- No backend or migration changes are required.
