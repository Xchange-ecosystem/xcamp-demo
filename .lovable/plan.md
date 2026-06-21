## Goal
Make the Notes and Journal **edit / new entry** views comfortable on mobile (≤640px). Today the action row ("Organise with Chi", "Delete", "Cancel", "Save") wraps into a tall, ragged block, the editor card padding is oversized, and the formatting toolbar reflows into 3 rows. This is purely a presentation/CSS pass — no logic, API, or data changes.

```text
NOW (mobile)                      AFTER (mobile)
[← Editing note]                  [←  Editing note            ]
[✨Organise][Delete]              [ ✨ Organise with Chi      ]  (full width)
[Cancel][Save]                    [ Delete ][ Cancel ][ Save  ]  (one row)
toolbar wrapping 3 rows           toolbar = single horizontal scroll row
```

## Changes

### 1. `src/components/editor/NoteEditor.tsx` (Notes editor header)
- Restructure the header (lines 146–180) so on mobile it stacks into two clean rows and promotes to the current inline layout at `sm:`:
  - Row 1: back button + "New note / Editing note" label.
  - Row 2: action buttons. "Organise with Chi" becomes full-width on mobile; Delete / Cancel / Save share an even row below (each `flex-1` on mobile, auto width at `sm:`).
- Keep all existing handlers, props, and button classes intact; only wrapper layout classes change.

### 2. `src/components/JournalFlow.tsx` (Journal note editor pane)
- Apply the same compact treatment to `NoteEditorPane` (lines 472–524): make the Save button full-width on mobile (`width:100%` under `sm`, auto above) and ensure the Back button and placement pills sit comfortably. Title input / textarea already span full width — only minor spacing tweaks.

### 3. `src/styles.css` (shared editor primitives, scoped to mobile)
Add a `@media (max-width: 640px)` block inside the existing `@layer components`:
- `.x-editor { padding: 16px; border-radius: var(--xr); }` — reduce the 24px desktop padding so content isn't squeezed.
- `.x-tt-toolbar { flex-wrap: nowrap; overflow-x: auto; -webkit-overflow-scrolling: touch; }` plus hide its scrollbar — keep formatting controls on one swipeable row instead of three stacked rows.
- `.x-tiptap { min-height: 220px; padding: 14px 16px; }` — tighter writing area on small screens.
- Slightly reduce the title `textarea` font (handled via a mobile class on the element) so long titles like "Revenue Performance Metrics" don't dominate the viewport.

## Out of scope
No changes to saving, organiser/Chi flow, API calls, routing, or the desktop layout (all desktop styling stays via `sm:`/desktop defaults).
