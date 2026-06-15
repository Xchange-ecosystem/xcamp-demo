# Sidebar Search / Filter / Sort — UX/UI Redesign

## Problem with the current design
The sidebar stacks four equally-weighted controls in a 2×2 grid (Sort, Project, Tag, Linked-only) below the search box. Issues:
- Visually heavy and repetitive — three near-identical dropdowns plus a toggle eat vertical space before any note is shown.
- "Sort: …" labels baked into options are a workaround for missing labels.
- No clear signal of which filters are *active*, and no fast way to clear them.
- Tags are hidden inside a dropdown even though they're the most natural way people browse notes.

## Proposed design

```text
┌─────────────────────────────┐
│ 🔍 Search notes…        ⌄    │  ← search bar; right side shows sort menu trigger
├─────────────────────────────┤
│ [All projects ▾] [Filters •2]│  ← compact row: project chip + Filters button w/ active count
├─────────────────────────────┤
│ #design ×  #urgent ×  ✕clear │  ← active-filter chips row (only shows when filters active)
├─────────────────────────────┤
│ 12 notes            Select   │
└─────────────────────────────┘
```

### 1. Search bar + inline sort
- Keep the search input full width with the magnifier icon.
- Move **sort** into a small icon button (arrows-up-down) anchored at the right edge of the search row, opening a dropdown menu (Updated / Created / Title, with a direction toggle asc/desc). Frees a whole grid cell and groups "how the list is ordered" with the list itself.

### 2. Single Filters popover instead of stacked dropdowns
- Replace the Project select, Tag select, and Linked-only toggle with **one "Filters" button** that opens a popover containing:
  - Project — radio list / select
  - Tags — multi-select chips (allow filtering by more than one tag, AND/OR)
  - "Linked notes only" — switch
- The button shows a **badge with the count of active filters** (e.g. "Filters • 2"), making active state obvious.
- Keep the most-used filter (Project) optionally as a quick chip outside the popover for one-tap access.

### 3. Active-filter chips row
- When any filter is set, show a compact row of removable chips (`#design ×`, `Project: Q3 ×`, `Linked ×`) plus a **Clear all** action. Gives instant feedback on what's narrowing the list and one-click removal — the biggest current gap.

### 4. Tag browsing upgrade
- Tags inside the Filters popover become toggleable chips (multi-select) rather than a single-select dropdown, since notes can have several tags.

### 5. Polish
- Debounce search input; show a clear (×) button inside the field when non-empty.
- Empty-state copy adapts: "No notes match these filters — Clear all" when filters are active.
- Result count ("12 notes") stays, next to the Select toggle.

## Components used
Use existing shadcn primitives to keep styling consistent: `Popover`, `DropdownMenu`, `Badge`, `Switch`, `Button`, `Input`. Active-filter chips use `Badge` with an inline × button.

## Scope
- Frontend/presentation only, all within `src/routes/index.tsx` (and small extracted components if helpful, e.g. `SidebarFilters.tsx`).
- No change to filtering logic/data — same `search`, `sort`, `filterProject`, `filterTag`, `filterLinked` state, except `filterTag` becomes an array for multi-select.
- No backend or API changes.

## Open question
Multi-tag filtering: should selecting multiple tags match notes with **any** of them (OR) or **all** of them (AND)? I'll default to OR unless you prefer AND.
