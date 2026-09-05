# Phase 0 — "My Goals" objective+task feed (BL-18)

Discovery report, filed before Phase 1 build per the task spec. Two Explore agents plus
direct reading covered the codebase; findings below correct a few premises in the
original task brief.

## 1. The "1 objective + 3 tasks" generation pattern — does not exist pre-built

There is **no spec doc** anywhere in the repo describing "build 1 objective with 3
tasks, allow dismiss vs open" — searched `docs/`, `README.md`, all markdown, and grepped
for the phrase. That part of the brief isn't grounded in this repo.

`handleProjectSelect`'s `vox.call()` (`src/routes/home.tsx:417-425`) is real, and **is**
reused verbatim by BL-30's Companion project-welcome summary
(`dispatchProjectWelcome`, `home.tsx:351-360` — same `vox.call({project_id, tenant_id,
altitude, aiPersona, context_scope: "project"})` shape, confirmed by that feature's own
commit message). But it generates **2-3 generic action cards or a text summary**, not a
structured objective+tasks object, and takes no task-count parameter.

Three other AI-generation paths exist, none of which produce "1 objective + 3 tasks" as
a first-class shape:

- **Backcaster/QuickRoad** (`src/lib/backcaster-api.ts`, `src/hooks/useQuickRoad.ts`) —
  a separate `xcampapi.xchange.eco` service producing an arbitrary-depth
  project/objective/note/task tree via session → interpret → generate → materialize.
  Heavyweight, wrong shape for a single "create new goal" input.
- **Organiser** (`src/lib/organiser-api.ts`, `propose`/`confirm`/`commit` against
  `/api/organiser/*`) — produces `new_objective`/`link_to_objective` proposals only, no
  task generation. Its `commit()` response has an unused `suggested_task_cards` field
  that nothing on the frontend reads.
- **Journal's `analyse()`** (`src/lib/journal-api.ts`, `/api/journal/analyse`) — takes
  free-text + `project_id`, returns open-ended "topics." **This is the closest existing
  analog**: `JournalFlow.tsx`'s `handleCreateObjectiveAndTasks` (line 642) accepts an
  objective topic, then immediately re-runs `analyse()` with the same entry text to
  generate nested child "task" topics parented under it — and
  `handleMoreTasksForObjective` (line 700) is literally the "sparkle → append more
  tasks without replacing" pattern, appending to local state
  (`setTopics(prev => [...prev, ...moreTopics])`).
- Navigator has **dead scaffolding** for this exact feature: `objectives
.tasks_generation_status` (DB column) + `useObjectiveGenerationStatus` polling +
  "Generating tasks…" placeholder UI (`NavigatorBrowser.tsx:425-430`) — but nothing in
  this repo ever flips that status to `"generating"`. The e2e test's own comment says
  the backend half needs `xcamp-backend PR#101`, not yet deployed. Not usable as-is.

**Decision:** reuse `useVox()` / `vox.call()` (`/api/answer-with-context`) — the one
generation call with a proven multi-site reuse track record (3 call sites) and that
already accepts `project_id`/`tenant_id`/`altitude`/persona. We prompt it explicitly
for exactly 1 objective + 3 tasks, embedding the project description and existing
objective/task titles as context text in `message` (the same way every existing call
site passes context — there's no dedicated structured-context field in the request
shape). We do **not** depend on the response's `proposal.tool` tagging (backend
cardinality/tagging isn't guaranteed) — we read `cards[0]` as the objective and up to
3 more as tasks by position, and persist via our own known-working RPCs on Accept
(§4), not via `executeProposal`.

## 2. Suggestion-card Accept/Dismiss pattern — no shared component, but a clear pattern to follow

Journal has three hand-rolled, inline-styled card components (no shared primitive):
`JournalItemCard`, `NestedTaskCard`, `HistoricalProposalCard` (all in `JournalFlow.tsx`).
Shape: title + summary + status badge, `Dismiss` / `Accept` buttons when pending,
collapses to a single `Open` button once saved. A structurally similar but separately
duplicated `ActionCardItem` exists in `components/companion/ChatThread.tsx` for chat
cards. Nothing is exported/shared between them.

**Decision:** build new card components under `src/components/goals/` following this
established shape (inline `--skin-*` styles, same Dismiss/Accept-vs-Open pattern) rather
than importing a nonexistent shared component — this matches "reuse the pattern" since
there is no single component to import.

## 3. Foldable/accordion — a real, installed, precedented primitive exists

`@radix-ui/react-accordion` is installed with a shadcn wrapper at
`src/components/ui/accordion.tsx`, and is already used once, in
`src/components/task-detail/AboutTab.tsx` (`<Accordion type="multiple">`). This is a
genuine reusable primitive, not a build-from-scratch situation.
`src/components/ui/collapsible.tsx` also exists but has zero real usage.

**Decision:** use `Accordion type="multiple"` — objective rows as `AccordionItem`s,
`AccordionTrigger` = objective title/status, `AccordionContent` = its task list.

## 4. Pending-state model — pure client-side (confirmed, no tension)

Checked the `objectives` and `notes` table schemas directly
(`src/integrations/supabase/types.ts`): **neither has any draft/pending/status column
suited to holding an unaccepted AI suggestion** (`objectives.status` is
active/inactive/completed; `notes` has no status column at all). There is no DB-side
draft mechanism to lean on, and building one is out of scope for this feature.

This matches Journal's own approach exactly: `JournalFlow` keeps generated topics in
local React state (`useState<JournalTopic[]>`) until the user acts; nothing is written
until Accept. **No tension to flag** — pure client-side pending state is both the
simplest option and the only one consistent with the existing schema, and it correctly
matches the "lost if you navigate away" framing in the spec.

## 5. "Add more tasks" append/dedup behavior

Journal's `handleMoreTasksForObjective` (line 700) doesn't pass prior-generated topics
back into `analyse()` as context — it just appends whatever comes back, trusting
distinct AI calls not to duplicate near-identically. Given `vox.call`'s `message` is a
free-text field (not a structured API), we can do better: when the user clicks
"add more tasks," the prompt explicitly lists the titles of already-pending (not yet
accepted) tasks for that objective and instructs the model not to repeat them, then
appends whatever comes back to the pending list — never replacing.

## 6. Persistence on Accept — real RPCs, not the AICard proposal-executor path

`vendor/client/src/proposals/executeProposal.ts` only implements `create_task` and
`add_note` tools (via the `upsert_objective_note` RPC); `objective_draft` (the type
meant for this exact use case) falls through to "requires backend route — not yet
wired." So Accept does **not** go through `executeProposal`. Instead:

- Accept objective → `createObjective(projectId, title)` (`src/lib/navigator-api.ts:110`,
  proven, already used by Navigator) + `updateObjective(id, {title, description})` for
  the AI-supplied description.
- Accept task → `createTaskNote(user, projectId, {title, objectiveId})`
  (`navigator-api.ts:195`, proven — inserts a `notes` row and an `objective_notes` link).
- Because a task needs a real `objective_id` to link to, accepting a task before its
  parent objective has been explicitly accepted silently persists the parent objective
  first (using its current pending title/description), then attaches the task. This
  keeps per-item Accept/Dismiss genuinely independent in the UI (per spec) while
  respecting the one real DB constraint (a task-objective link needs both rows to
  exist). Once any task under a pending objective has been accepted this way, the
  objective's own Dismiss/Accept controls are replaced with a plain confirmation state
  (mirrors Journal's `isSaved → Open` collapse) since it's no longer "pending."
- Dismiss (objective or task) discards only that pending item from local state; no DB
  call if it was never accepted.

## 7. Routing — a nav slot for this already exists, pointed at the wrong place

`src/components/AppSidebarExperimental.tsx` (the default, non-legacy sidebar)
already has a **scaffolded, unused nav entry**:

```
{ title: "goals", url: "", icon: Target, label: "My Goals", parameterised: true }
```

in `PROJECT_NAV` (line 84) — `Target` is imported and used nowhere else. It has no
dedicated click-handler branch (unlike `logbook`/`navigator`, which do), so it falls
through to the generic `resolveUrl()`, whose `parameterised` branch currently resolves
to `/project/${activeProjectId}` — the existing Project Details page
(`src/routes/project.$projectId.tsx`), which only has a small **read-only** flat
objectives list, not an accordion feed, and no generation UI.

**Decision:** this nav slot is clearly meant for this feature; wire it up properly
rather than building a disconnected route. Add a new nested route
`src/routes/project.$projectId.goals.tsx` → `/project/$projectId/goals` (consistent
with this repo's dot-segment file routing, e.g. `profile.appearance.tsx`), and point
`resolveUrl`'s parameterised branch at it.

## Net build plan (Phase 1)

1. New route `project.$projectId.goals.tsx` — `AppShell` + `PageHeroShell`, fetches the
   project (title/description) and its objectives via the existing `useObjectives` hook.
2. `src/components/goals/GoalsFeed.tsx` — accordion feed (shadcn `Accordion`) of
   existing objectives, each expandable to its persisted tasks (reusing
   `useObjectiveTasks`/`toggleNoteDone` from `navigator-api.ts`), plus a pending-items
   section rendered above/inline using the new card components.
3. `src/components/goals/GoalCard.tsx` / `TaskSuggestionCard.tsx` — new, following the
   Journal card pattern (§2), Accept/Dismiss independent per item.
4. `src/lib/goals-generation.ts` (or inline in the feed) — wraps `useVox()` with the
   1-objective+3-task prompt (§1) and the "add more tasks" dedup prompt (§5).
5. Client-side pending-state reducer (objective + task list, §4).
6. Unsaved-changes warning: `useBlocker` from `@tanstack/react-router` (confirmed
   available, v1.168) for in-app navigation, plus a `beforeunload` listener for
   tab-close/refresh, both gated on "any pending item exists."
7. Sidebar: point the existing "My Goals" `resolveUrl` slot at the new route.

## Verification note

`node_modules` was not present at session start; ran `bun install` to enable local
build/lint/test verification. Given the size of this build, live verification will be
against local dev/build/lint — this session has no access to a live Vercel preview URL
or a live Supabase-authenticated browser session, so item 2/4 in the spec's
verification table (AI generation quality against a real project's context, and
accept-then-reload persistence) cannot be confirmed live from here; that must be a
human verification pass on the deployed preview. This is called out explicitly in the
PR description.
