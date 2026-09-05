# Task Fullscreen Modal — Phase 0 Discovery Report

**Date:** 2026-08-21
**Type:** Discovery only — two audits (token/skin system, database schema) + shell confirmation. No implementation, no migrations applied.
**Source of truth for design:** `TaskFullscreenMockup.jsx` (provided separately, not in this repo — six tabs: About this Task, Do & Document, Match & Collaborate, Linked Items, Actions & Artefacts [inactive], Review & Complete [inactive]).
**Method:** Direct source reads + repo-wide grep + live queries against the `Xcamp & Nox` Supabase project (`ueebzuleyrnsrxbowdfa`) via the Supabase MCP tools — schema and row counts below are live, not inferred from local migration files (the repo only has one local migration file; the real schema lives remotely).
**Tagging:** `CONFIRMED` / `NOT FOUND` / `NEEDS DECISION`, each with file:line or query evidence.

Two decisions already made (not re-litigated here): (1) Scientific/Playful skin axis is being retired in favor of one unified `--skin-*` token set; the Xcamp/Nox light/dark system is untouched. (2) Altitude branching stays in the codebase; the task modal will render only the full-depth (altitude=2) six-tab layout, not gated by altitude.

---

## Section A — Token/skin system

### A1. Live `--skin-*` CSS custom property definitions — `CONFIRMED`

Only two CSS files exist in the repo: `src/styles.css` and `vendor/ui/src/styles/globals.css`. No `tailwind.config.*` file exists — Tailwind is pulled in via `@import 'tailwindcss'` inside `vendor/ui/src/styles/globals.css`, which defines zero `--skin-*` vars.

`src/styles.css` defines **13 `--skin-*` tokens**, each a flat light/dark pair (no third branch):

| Token                    | `:root` (light / Xcamp)                            | `.dark` (Nox)                                               |
| ------------------------ | -------------------------------------------------- | ----------------------------------------------------------- |
| `--skin-bg`              | `hsl(0, 0%, 100%)` — L116                          | `hsl(222, 47%, 11%)` — L225                                 |
| `--skin-surface`         | `hsl(210, 20%, 98%)` — L117                        | `hsl(217, 33%, 17%)` — L226                                 |
| `--skin-surface2`        | `hsl(210, 20%, 95%)` — L118                        | `hsl(215, 28%, 22%)` — L227                                 |
| `--skin-ink`             | `hsl(222, 47%, 11%)` — L119                        | `hsl(210, 40%, 96%)` — L228                                 |
| `--skin-ink-soft`        | `hsl(215, 16%, 47%)` — L120                        | `hsl(215, 20%, 70%)` — L229                                 |
| `--skin-ink-faint`       | `hsl(215, 16%, 65%)` — L121                        | `hsl(215, 16%, 50%)` — L230                                 |
| `--skin-line`            | `hsl(214, 32%, 91%)` — L122                        | `hsl(215, 28%, 25%)` — L231                                 |
| `--skin-line-soft`       | `hsl(214, 32%, 96%)` — L123                        | `hsl(215, 28%, 20%)` — L232                                 |
| `--skin-accent`          | `#4de0c1` — L124                                   | `#b689e6` — L233                                            |
| `--skin-accent-soft`     | `#dcf8f2` — L125                                   | `hsl(291, 35%, 22%)` — L234                                 |
| `--skin-accent-gradient` | `linear-gradient(135deg, #34acbf, #4de0c1)` — L126 | `linear-gradient(135deg, #731f7d, #b689e6, #34acbf)` — L235 |
| `--skin-danger`          | `hsl(0, 72%, 50%)` — L140                          | `hsl(0, 84%, 65%)` — L263                                   |
| `--skin-on-accent`       | `hsl(222, 47%, 11%)` — L141                        | `#fff` — L264                                               |

`src/styles.css:61-70` also bridges these into Tailwind-consumable `--color-skin-*` aliases — a passthrough, not an additional definition.

**Comment at `src/styles.css:110`** already labels this block `/* Xcamp skin tokens (Scientific / Platform — the default/light skin) */` — i.e. the file itself only ever held the Scientific values; no Playful counterpart exists in this file.

Four more `--skin-*` tokens are _referenced_ by components but not defined in `styles.css` at all: `--skin-font-head`, `--skin-radius` (inline fallback `10px`), `--skin-surface-raised`, `--skin-warning` (inline fallback `#B85E08`). These only resolve at runtime via the vendor skin injection described in A2.

### A2. Is Scientific/Playful actually wired live? — `CONFIRMED`: engine exists, is dead code, never reaches a user

This needs a more precise answer than "live" or "never existed" — both are partially true of different layers:

- **A real, complete two-tone engine exists** in `vendor/ui/src/skin/` (`types.ts`, `tokens.ts`, `skins.ts`, `apply.ts`): `SCIENTIFIC_TOKENS`/`PLAYFUL_TOKENS` (full color/radius/typography/motion sets), a 6-entry `SKIN_REGISTRY` (paradigm × tone), and `applySkin()`/`resolveSkin()`.
- **It has exactly one call site in the whole app**, and it's hardcoded: `src/main.tsx:11,20` — `import { PLATFORM_SCIENTIFIC } from "@xchange/ui"; applyBaseSkin(PLATFORM_SCIENTIFIC);`. Comment at `main.tsx:16-19`: "Publish the default scientific skin's CSS vars before first paint."
- **No toggle, store, context, hook, or UI control switches it.** Repo-wide grep for `PLATFORM_PLAYFUL|COMPANION_PLAYFUL|CANVAS_PLAYFUL|resolveSkin|SKIN_REGISTRY|useSkinStore` in `src/` → zero hits. `vendor/ui/src/skin/skins.ts:3` even says the registry is "the lookup table used by `useSkinStore` in `xcamp-foundation-0.2`" — a store that lives in an external package not vendored here and doesn't exist in this repo.
- **Persisted-preference plumbing exists in the DB but is never queried.** `user_preferences.skin_config: Json` exists as a real column in the generated Supabase types (`src/integrations/supabase/types.ts:5993-6026`), and `src/types/xcamp.ts:51-60` declares a matching `SkinConfig` TS type with a comment saying it's "stored in `user_preferences.skin_config`" — but grep for `user_preferences`/`skin_config` in `src/` shows nothing ever reads or writes it.
- **The `data-skin-tone`/`data-skin-paradigm` attributes it stamps onto `<html>` are never read** — zero CSS selectors anywhere key off them.
- **A separate, also-dead sibling module** — `vendor/ui/src/claude-design/tokens.{ts,js,json}` — defines its own `ObjectiveSkinType = 'scientific' | 'playful'` with a comment referencing "Claude Design export v1.0.0 (2026-06-23)". This is almost certainly the direct export target of the design-only `ObjectivePrototype.jsx` artifact mentioned in the brief. It's reachable only transitively through the `@xchange/ui` barrel export, never imported by name in `src/`.

**Verdict:** Scientific/Playful branching is not "only ever a design-artifact concept with zero footprint in this repo" (there is real vendored code implementing it), but it is also correctly described as **never live for any user** — one hardcoded call, no reachable toggle. Retiring it means: stop importing the two-tone engine (or leave it unused — it's already inert), and treat `styles.css`'s existing 13-token flat pair as the actual, sole, going-forward `--skin-*` set. There is nothing "switchable" to delete from the user's perspective; the cleanup is about not building new UI that could accidentally reach the dead engine, not about ripping out live branching.

### A3. Xcamp/Nox theme system stays separate — `CONFIRMED`

`src/lib/theme.tsx` (67 lines) is a plain `light | dark | system` toggle persisted to `localStorage["xcamp-theme"]`, whose only effect is `document.documentElement.classList.toggle("dark", ...)` (`theme.tsx:20-24`). Zero references to `skin`, `Scientific`, `Playful`, `paradigm`, or `tone` anywhere in the file. It's the mechanism that flips between the `:root` and `.dark` blocks in A1 — not the same axis as A2 at all. `main.tsx:10`'s own comment confirms the two systems aren't yet unified but are cleanly layered (design-system tokens key off the `.dark` class `ThemeProvider` sets, nothing more).

### A4. Proposed `--skin-*` values from the mockup palette — `NEEDS DECISION`

The mockup's `T` token object (ink, inkSoft, surface, surface2, line, accent, accentGrad, good, bad, radius, radiusLg, radiusPill) maps cleanly onto the existing 13-token convention in `styles.css` — it's largely the same _shape_ already:

| Mockup `T` token | Existing app token       | Notes                                                                                                                                                        |
| ---------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `ink`            | `--skin-ink`             | direct match                                                                                                                                                 |
| `inkSoft`        | `--skin-ink-soft`        | direct match                                                                                                                                                 |
| `surface`        | `--skin-surface`         | direct match                                                                                                                                                 |
| `surface2`       | `--skin-surface2`        | direct match                                                                                                                                                 |
| `line`           | `--skin-line`            | direct match                                                                                                                                                 |
| `accent`         | `--skin-accent`          | value differs from current teal (`#4de0c1`) — needs the actual hex from the mockup file to reconcile                                                         |
| `accentGrad`     | `--skin-accent-gradient` | direct match                                                                                                                                                 |
| `good`           | _(no existing token)_    | would need a new `--skin-good` (or reuse semantics — check against `--skin-on-accent`/success usage)                                                         |
| `bad`            | `--skin-danger`          | closest existing match, confirm semantics line up                                                                                                            |
| `radius`         | `--skin-radius`          | **referenced by components today but never defined in `styles.css`** (see A1) — this is the one token where "propose a value" is also "fill an existing gap" |
| `radiusLg`       | _(no existing token)_    | new                                                                                                                                                          |
| `radiusPill`     | _(no existing token)_    | new                                                                                                                                                          |

I don't have the mockup file's actual hex/px values in this session (it's provided separately and wasn't present in the repo or attached) — **the mapping above is structural only; final values need to come from a session with the actual `TaskFullscreenMockup.jsx` file to fill in `accent`, `good`, `radius`, `radiusLg`, `radiusPill`.** Flagging as `NEEDS DECISION` rather than proposing placeholder hex values, since this table is shared app-wide (52 files in `src/` + 7 in `vendor/` consume `var(--skin-*)`, listed below) — a wrong guess here has real blast radius, not just a task-modal-local one.

**Blast radius if `--skin-*` values change:** 52 files in `src/` (`grep -rc "var(--skin-"`), notably `JournalFlow.tsx` (85 occurrences), `ExperimentalHome.tsx` (73), `PortfolioView.tsx` (57), `ItemSidepanel.tsx` (56), `NotesBrowser.tsx` (41), `CompanionRail.tsx` (39), plus `NavigatorGraph.tsx`, `NavigatorBrowser.tsx`, `project.$projectId.tsx`, `task.$taskId.tsx` (24), `NoteEditor.tsx`, `AppShell.tsx`, and 40+ more — plus `styles.css` itself and 7 vendor files (`RubricMini.tsx`, `BarChart.tsx`, `KpiCard.tsx`, `DataTable.tsx`, `LineChart.tsx`, `CompanionCardStack.tsx`, `ChiCompanionPanel.tsx`). **Changing existing token values (bg/surface/ink/line/accent/etc.) is an app-wide skin change, not a task-modal-scoped one.** Adding wholly new tokens (`--skin-good`, `--skin-radius-lg`, `--skin-radius-pill`) is low-risk/additive. Filling in the currently-undefined `--skin-radius`/`--skin-font-head`/`--skin-surface-raised`/`--skin-warning` (referenced but undefined today, silently falling back to inline defaults or nothing) is also low-risk and arguably a pre-existing bug worth fixing regardless of this project.

---

## Section B — Database schema gaps

All findings below are from live queries against the `Xcamp & Nox` Supabase project, not local migration files (the repo has only one local migration on disk; the working schema lives remotely).

### Re-verify: already-believed-present

**B0a. `notes.detail` (jsonb)** — `CONFIRMED`. Live column, `jsonb not null default '{}'`. Already home to more than just Do & Document's blob: it's also where tags-adjacent archive state and attachments live (see below) — `detail` is a general-purpose extension point on `notes`, not single-purpose.

**B0b. `attachments` / `attachment_links`** — `NEEDS DECISION` (re-verification surfaced a discrepancy from the assumption). The tables exist live with real rows (`attachment_links`: 2 rows linking to 2 distinct task notes, confirmed via `entity_table='notes' AND note_type='task'` join). **But no code anywhere in this repo (the `src/` and `supabase/functions/` trees) ever queries `attachments` or `attachment_links`** — repo-wide grep for `.from("attachments")` / `.from("attachment_links")` returns nothing outside the generated `types.ts`. The 2 existing rows must have been written by something outside this repo (another service sharing the same Supabase project, or manual seeding).
Meanwhile, **the actual live attachment mechanism this repo's editor uses is a third one**: `notes.detail.attachments` — a jsonb array of an inline `NoteAttachment` shape (`src/types/xcamp.ts:13-17`), read/written by `NoteEditor.tsx:81,122-123` and `xcamp-api.ts:111,117,150-151`. So there are two live-ish attachment concepts in this codebase's orbit: a relational one this repo doesn't touch, and a jsonb-embedded one this repo actively uses. **For the mockup's "Actions & Artefacts" tab (marked inactive/coming soon anyway) and for Do & Document's attachment needs, the canonical live mechanism to build against is `notes.detail.attachments`, not the `attachment_links` table** — flagging so Phase 1 doesn't accidentally build against the unused relational path.

**B0c. Tags: `notes.tags` array vs. `note_tags`/`tags` relational tables** — `CONFIRMED`, canonical = `notes.tags` (text[] array column). Evidence: `notes.tags` is read in every note-fetch path (`xcamp-api.ts` `NOTE_COLUMNS`, `navigator-api.ts`), written on create (`xcamp-api.ts:128`) and update (`xcamp-api.ts:161`), written by an auto-tag feature (`xcamp-api.ts:339-366`), and drives real UI — tag chips and filter facets in `NotesBrowser.tsx:185-704`, chip editor in `NoteEditor.tsx`, and the fullscreen task view itself already renders `noteRow.tags.map(...)` at `task.$taskId.tsx:375-379`. By contrast, `note_tags`/`tags` (relational) appear **only** in the generated `types.ts` schema file — zero application-code call sites anywhere. Build the mockup's tag chips against `notes.tags`.

**B0d. `task_assignments`** — `CONFIRMED` as described: live columns are exactly `id, task_note_id, assignee_central_id, assigned_by_central_id, created_at, tenant_id` — no role/remuneration/value/hours/status. **New finding: the table has 0 rows and zero application-code references anywhere in the `src/` tree** — it's fully unused today, not just missing fields. This matters for B2 below: there's no existing-usage cost to restructuring it.

### Needs a real live check

**B1. Timeframe (Start/End dates) on a task** — `CONFIRMED` gap. Live `notes` columns (full list, confirmed via `information_schema.columns`): `id, owner_central_id, note_type, title, body_html, body_text, body_markdown, done, visibility, price_credits, created_at, updated_at, detail, preferred_external_container_id, visibility_scope, is_restricted, tenant_id, tags`. No due/start/end-date-shaped column exists. **Notably, `objectives` (the parent entity) already has exactly this shape** — `objectives.start_date date` and `objectives.end_date date`, both nullable. Proposal: mirror that naming/type exactly for consistency —

```
notes.start_date  date  null
notes.end_date    date  null
```

(Not applied — proposal only.)

**B2. Match & Collaborate per-assignment fields (Role, Remuneration mode, Value in Xcoins, Max hours, Status)** — `CONFIRMED` none exist on `task_assignments` today (see B0d). This is a real architectural fork, not just a column-add — reporting both options and my read, per instructions, rather than picking one:

- **Option 1 — extend `task_assignments` directly.** Add:
  ```
  task_assignments.role              text        null   -- or an enum if the mockup's Role list is closed
  task_assignments.remuneration_mode text        null   -- e.g. 'fixed' | 'hourly' | 'equity-like' — needs mockup's actual vocabulary
  task_assignments.value_xcoins      numeric     null
  task_assignments.max_hours         numeric     null
  task_assignments.status            text        not null default 'pending'  -- needs its own enum, see below
  ```
- **Option 2 — route through the existing `assignments` table**, using its generic `object_type`/`object_id` pattern (`object_type='task_note'`, `object_id=<task_note_id>`) instead of a parallel table. `assignments` already has near-1:1 field matches for three of the five needed fields: `status` (real 7-value `assignment_status` enum: draft/invited/accepted/declined/withdrawn/completed/cancelled — richer than a boolean), `proposed_value` (→ Value), `currency_type` (defaults `'credits'`, could represent Xcoins), plus `contract_id`/`accepted_at`/`completed_at`/`reward_status`/`verified_at`/`verified_by` workflow fields the task modal doesn't currently need but could grow into. Still missing even under this option: **Role** and **Max hours** — neither exists on `assignments` either, so either path needs at least those two new columns.

**My read:** `assignments` is a live, actively-used table today (**9 real rows, all `object_type='objective'`**, written by something outside this repo's own code — grep found zero `src/**`/`supabase/functions/**` call sites for it either, so it's populated by another service in the same Supabase project). `task_assignments` is fully unused (0 rows, 0 code references) — greenfield, no migration-cost argument either way. The generic-table option avoids building a second parallel status/value vocabulary that will inevitably drift from the objective-level one; the dedicated-table option keeps task-level assignment simple and decoupled from a table whose richer contract/fund/reward machinery may be irrelevant noise for a task assignee row. **This is a product/architecture call, not a technical one — flagging for human decision rather than picking.**

**B3. Project / Objectives / Dimension / Category (Labels and tags section)** — `CONFIRMED`, resolves via existing links, no new columns needed. Chain: `notes` (task) → `objective_notes` (`objective_id, note_id` — confirmed live columns) → `objectives` (`project_id, dimension text, category text` — confirmed live columns, both nullable text). So Project/Objective/Dimension/Category can all be resolved by joining `objective_notes` → `objectives` from the task's note id; nothing needs to be added to `notes`.

**B4. Archive (kebab menu)** — `CONFIRMED`: exists and is already wired to live UI, but as a `detail.archived` jsonb flag, not a dedicated column.

- `xcamp-api.ts:97` — `listNotes()` excludes archived via `.or("detail->>archived.is.null,detail->>archived.eq.false")`.
- `xcamp-api.ts:235-246` — `archiveNote()` sets `detail: { ...note.detail, archived: true }`.
- `ItemSidepanel.tsx:1004-1020` — the kebab menu's **"Delete"** item (labeled Delete, `Trash2` icon) actually calls `archiveNote()` under the hood — it's a soft-archive, not a real row delete, already.
  No dedicated `archived`/`is_archived`/`deleted_at` column exists or is needed — the mockup's Archive kebab option can call the same `archiveNote()` path already used elsewhere. (No migration needed for this item at all — noting the naming mismatch between "Delete" in the current kebab and "Archive" in the mockup for Phase 1's attention, not a schema question.)

**B5. Created by vs. Owned by** — `CONFIRMED`: `owner_central_id` is set to the creating user on every insert and is the _only_ creator concept that exists; there is no separate "created by" tracking anywhere.

- `xcamp-api.ts:130` `createNote()` and `navigator-api.ts:180` `createTaskNote()` both stamp `owner_central_id: user.centralId` at creation time (comment: "central_users.id — not authId").
- Every place the UI shows "created by" (`xcamp-api.ts:73`, `navigator-api.ts:41`, `task.$taskId.tsx:153`, `ItemSidepanel.tsx:750,1010`, `EntityPanel.tsx:56`) does `created_by: raw.owner_central_id` — a **client-side rename of the same value**, not a distinct DB column. There's no `detail.created_by`, no audit table, nothing that could ever diverge from "owner." **If "Created by" and "Owned by" are meant to be able to differ (e.g. reassignment changes owner but not original creator), that needs a new column** — `notes` has no way to represent that today. If they're meant to always be the same value (just shown twice with different labels per the mockup's Set-up accordion), no schema change is needed. Flagging as `NEEDS DECISION` on intent, not a schema gap I can resolve alone.

**B6. Status pill (task-level, top bar)** — `CONFIRMED` gap: `notes.done` (boolean) is the only status-shaped field on notes/tasks, and it's binary. A real multi-value status enum exists in this codebase, but it's `objectives.status` (`STATUS_OPTIONS = ["draft","active","in_progress","blocked","done"]`, wired in `ItemSidepanel.tsx:50-57,515,572-575`) — a **different entity**, not reusable as-is without a schema link. No `detail.status` usage exists anywhere on notes. If the mockup's top-bar status pill needs more than open/done, propose:

```
notes.status  text  not null default 'active'
```

with an app-level vocabulary to define (possibly mirroring `objectives.status`'s five values for consistency, or task-specific values — needs the mockup's actual pill states to pin down). `done` boolean could either stay as a derived/synced field or be replaced by `status='done'` — that migration-shape question is itself worth flagging for Phase 1 rather than deciding here.

---

## Section C — Existing shell (confirmed, reuse as-is)

Re-verified against the previously-documented shell; all core claims hold, with a few naming/location corrections worth Phase 1 knowing about.

**C1. `useFullscreenTaskStore`** — `CONFIRMED`, `src/store/fullscreenTaskStore.ts:1-13`. State is `taskId: string | null` (not a separate `isOpen` boolean — derived as `taskId !== null` at call sites); actions are `open(id)` / `close()` (not `openTask`/`closeTask`). No tab-related state yet — Phase 1 will need to add that.

**C2. `TaskFullscreenModal`** — `CONFIRMED`, `src/components/TaskFullscreenModal.tsx` (64 lines). Backdrop: `position: fixed; inset: 0`, `background: rgba(0,0,0,0.10)` — 10% confirmed (`:26-29`). Modal shell itself uses `inset: 16` (`:44`), `borderRadius: 12`, on `var(--skin-surface)`. Escape key (`:10-17`) and backdrop click (`:24`) both call `close()`. **One nuance:** the X/close button is not chrome owned by this modal file — it's rendered one layer down, inside `TaskPageContent`'s own top bar (a "Close" button with a `ChevronLeft` icon). All three dismiss paths exist and work; ownership is just split across two files.

**C3. Open handler wiring** — `DIFFERENT NAME` than assumed, same behavior: no function literally named `handleOpenFullscreen` exists. The actual trigger is `FullscreenButton` in `src/components/sidepanel/ItemSidepanel.tsx:973-981`, calling `useFullscreenTaskStore.getState().open(item.id)` directly, rendered in the sidepanel header (`ItemSidepanel.tsx:906`). This is the single call site of `.open(...)` in the codebase — comments at `:967-971,1044-1045` confirm this replaced an earlier kebab-menu-only entry point.

**C4. `TaskPageContent`** — `CONFIRMED` to exist and be swappable, with one structural correction: it is **not a standalone file** — it's a named export inside the route file `src/routes/task.$taskId.tsx:116`, `export function TaskPageContent({ taskId, onClose }: { taskId: string; onClose: () => void })`. Props contract is exactly `{ taskId, onClose }` — no tab state, no other props (altitude is read internally via `useAltitudeStore()`, not passed in). It's imported by `TaskFullscreenModal.tsx:4` as `import { TaskPageContent } from "@/routes/task.$taskId"`, and it's **also** used directly by the standalone `/task/$taskId` route (`TaskPage` component, `task.$taskId.tsx:401-408`, with a different `onClose`). **A tabbed replacement must either replace this export in place inside `task.$taskId.tsx`, or be re-exported from that same module path** — both consumers (fullscreen modal and standalone route) import from `@/routes/task.$taskId`, so the swap can be scoped to that one file without touching either caller, as long as the `{ taskId, onClose }` contract is preserved. Current internals (single flat view, not tabs): auth guard → data fetch → loading/error states → top bar (Close button + title) → `NoteEditor` body, with an altitude-gated right column (`LinkedObjectivesPanel` + a meta strip at altitude 2) — this whole altitude-branched body is exactly what the six-tab layout replaces, per the mockup's "build full-depth only" instruction.

**C5. Composition** — `CONFIRMED`. Full render tree: `AppShell` (mounts `TaskFullscreenModal` once, globally, `AppShell.tsx:296`; `CompanionShell` was consolidated into `AppShell` so `/home` has it too) → user clicks `FullscreenButton` in `ItemSidepanel` → `useFullscreenTaskStore.open(id)` → `TaskFullscreenModal` subscribes, renders `<SidepanelProvider><TaskPageContent taskId={taskId} onClose={close} /></SidepanelProvider>` inside the inset-16 shell. No other wrapper or duplicate composition exists.

---

## Proposed Phase plan (for review, not yet started)

1. **Shell swap.** Replace `TaskPageContent`'s internals (in `src/routes/task.$taskId.tsx`) with the mockup's six-tab shell, altitude checks removed for this component only (render full-depth unconditionally), keeping the `{ taskId, onClose }` contract so `TaskFullscreenModal.tsx` and the standalone `/task/$taskId` route need no changes. Add tab state to `useFullscreenTaskStore` (or local state in the new component — TBD in Phase 1) since it doesn't exist yet (C1).
2. **About this Task.** Fewest schema gaps — Labels/tags resolve via existing `objective_notes`→`objectives` chain (B3, no migration), tags via `notes.tags` (B0c, no migration), archive via existing `archiveNote()` (B4, no migration). Needs decisions on B5 (created-by vs owned-by) and B6 (status pill vocabulary) before those specific fields can render real data instead of placeholders.
3. **Do & Document.** `notes.detail` jsonb already confirmed as the home for this (B0a); attachments should build against `notes.detail.attachments` (the actually-live mechanism), not `attachment_links` (B0b).
4. **Linked Items.** Reuses the same `objective_notes`/linked-objectives infrastructure already present in the current altitude-2 view (`LinkedObjectivesPanel`) — likely the lowest-effort tab after About.
5. **Match & Collaborate — last.** Blocked on the B2 architectural decision (extend `task_assignments` vs. route through `assignments`) plus B1 (timeframe columns) if the mockup's per-assignment view shows task dates. Needs a migration either way — should not start until B1/B2/B5/B6 decisions land.
6. **Actions & Artefacts / Review & Complete** — stay inactive/"coming soon" per the mockup; no backend work implied yet.

Waiting for human review on: A4 (final token values — need the actual mockup file), B1/B2/B5/B6 (schema proposals), before Phase 1 starts.
