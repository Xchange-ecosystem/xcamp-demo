# Phase 0 Audit — `xcamp-nox-founder-app` main
**Date:** 2026-08-09  
**Type:** Read-only source audit (code-level; no browser available in this environment)  
**Scope:** All areas in sections 2.1–2.9 of the kickoff brief  
**Method:** Direct source reads + grep across the full repo. Where live click-through would be required to confirm rendering, that is noted explicitly as "requires live verification." Code-level findings are unambiguous; rendering claims are marked accordingly.

---

## Method note: live testing not available

This session ran in a remote code execution environment without a browser. Every finding below is source-confirmed. Where a finding depends on actual rendered output (pixel layout, computed CSS, real console output), it is explicitly marked `[REQUIRES LIVE VERIFY]`. Do not treat those as confirmed; they are the highest-priority items for the next session's click-through.

---

## 2.1 App Entry & Default UI

---

```
[CONFIRMED] uiVersion.ts — experimental is the default; no query param required
  Tested: src/lib/uiVersion.ts (source read)
  Expected: experimental is the default, ?ui=v1 opts into legacy
  Observed: isLegacyUi() returns false without any param. initLegacyUi() is a
    write-only function — it sets "v1" but never clears. Experimental is the
    default for every fresh session. This is working as designed.
  Console/Network issues: none
  Evidence: uiVersion.ts lines 1–13
```

```
[GAP] SessionStorage escape hatch — no way to return from ?ui=v1 to experimental
  Tested: src/lib/uiVersion.ts, src/routes/home.tsx (source read)
  Expected (per kickoff brief): escape hatch to "return to experimental" either
    built or confirmed absent
  Observed: ABSENT. initLegacyUi() calls sessionStorage.setItem() only; there
    is no clearLegacyUi(), no "Exit legacy mode" button, no UI control that
    clears the sessionStorage key. Once ?ui=v1 is visited, that tab is
    permanently in legacy mode until the user manually clears sessionStorage or
    closes the tab. This is the confirmed root cause of the "regression"
    pattern where testers on contaminated tabs saw the legacy UI.
  Console/Network issues: none
  Evidence: uiVersion.ts; no clearLegacyUi export anywhere in codebase
```

```
[DIVERGES] ?nav=experimental param — vestigial, has no effect on rendering
  Tested: src/routes/home.tsx, src/components/AppSidebarExperimental.tsx (source read)
  Expected (per kickoff brief): ?nav=experimental activates experimental UI
  Observed: The param is accepted by route validators (home.tsx validateSearch,
    navigator.tsx validateSearch) but is NOT used by any component to make a
    rendering decision. The sidebar comment says "Activate with ?nav=experimental"
    but AppSidebarExperimental is shown whenever isLegacyUi() is false —
    i.e., by default, with no param needed. Testing with ?nav=experimental vs.
    without it produces identical output. This naming creates test confusion
    (tester adds param expecting a mode switch; none occurs).
  Console/Network issues: none
  Evidence: home.tsx line 78 (param accepted, not consumed by components),
    AppSidebarExperimental.tsx (gating logic is isLegacyUi() only)
```

```
[CONFIRMED] AppSidebarExperimental — "Logbook" label matches Phase 1 IA
  Tested: src/components/AppSidebarExperimental.tsx (source read)
  Expected (per kickoff): Logbook as single parent, contradicting earlier
    "Journal"-labeled sidebar reports
  Observed: PROJECT_NAV array: title="logbook", label="Logbook", url="/journal".
    Subitems when expanded: "My Journal" → /journal, "My Notes" → /notes.
    Notes is nested under Logbook, NOT under Navigator. This MATCHES the
    Phase 1 IA decision.
  Console/Network issues: none
  Evidence: AppSidebarExperimental.tsx PROJECT_NAV lines (title: "logbook", label: "Logbook")
```

```
[CONFIRMED] Three branching files — home.tsx, AppShell.tsx, CompanionShell.tsx
  Tested: all three files (source read)
  Expected: These three files are the complete set that gates on isLegacyUi()
  Observed: CONFIRMED, but with a critical structural nuance:
    - home.tsx: branches entire UI tree (legacy glass-panel vs. experimental views)
    - AppShell.tsx: branches sidebar (AppSidebar vs. AppSidebarExperimental),
      contains FloatingAltitudeDial and TaskFullscreenModal
    - CompanionShell.tsx: branches sidebar only; DOES NOT contain
      RightPanelProvider, FloatingAltitudeDial, or TaskFullscreenModal
    The /home route uses CompanionShell, NOT AppShell. So FloatingAltitudeDial
    and TaskFullscreenModal are absent on /home regardless of UI mode.
  Console/Network issues: none
  Evidence: home.tsx (component wrapped in CompanionShell), AppShell.tsx line 257-258,
    CompanionShell.tsx (no RightPanelProvider, no FloatingAltitudeDial import)
```

```
[REQUIRES LIVE VERIFY] ProjectEntryScreen — logo, colors, layout vs. "as bad as before" report
  Tested: src/components/ProjectEntryScreen.tsx (source read)
  Expected (per Fabian's 2026-08-08 observation): still broken after reported fix
  Observed (code level):
    - Logo: brand.iconUrl from useBrand() is used in the orb element (line 212).
      The hook correctly resolves to Nox or Xcamp icon based on resolved theme.
    - Colors: Main card uses var(--skin-surface), var(--skin-ink),
      var(--skin-accent) — all properly tokenised.
    - Hardcoded hex: XCAMP/NOX palette constants exist for aurora wash, skyline
      SVG fills, and orb gradient. A comment explicitly marks these as
      "Decorative-only colors with no --skin-* equivalent." This is intentional.
    - Layout: 2-per-row flex-wrap tile grid matching EcosystemHomeView pattern;
      maxWidth 460px centered card; consistent with spec.
    - ModeSwitchButton: uses hardcoded "#1a1f29"/"#fff" for active state (not
      skin tokens), but this is the pre-theme-switch toggle rendered over a
      decorative background layer — borderline defensible.
  What Fabian saw could not be reproduced from source alone. Possibilities:
    (a) Live rendering has a CSS inheritance issue not visible in source
    (b) Fabian was on a legacy-mode tab (CompanionShell vs. AppShell)
    (c) A Vercel deploy lag vs. the merged PR
  This MUST be live-verified in a fresh private window with sessionStorage cleared.
  Console/Network issues: none (source level)
  Evidence: ProjectEntryScreen.tsx lines 1–465 (full read)
```

---

## 2.2 Companion / Chi Side Panel

---

```
[CONFIRMED] CompanionSidePanel (PR #83) — fully removed
  Tested: grep across entire src/ directory
  Expected: CompanionSidePanel gone, or any surviving code path to it
  Observed: Zero matches for "CompanionSidePanel" anywhere in the codebase.
    Completely absent.
  Console/Network issues: none
  Evidence: ripgrep: no files found
```

```
[DIVERGES] Three-panel model on /home — CompanionShell does NOT implement it
  Tested: src/routes/home.tsx, src/components/CompanionShell.tsx,
    src/components/AppShell.tsx (source read)
  Expected (per spec): left nav / center main / right sidepanel on /home
  Observed: /home uses CompanionShell, not AppShell. CompanionShell layout:
      SidepanelProvider > SidebarProvider > [left sidebar] + [main] + ItemSidepanel
    No RightPanelProvider, no RightPanelSlot, no 480px-wide right rail.
    ItemSidepanel in CompanionShell renders as an overlay Sheet, not a
    layout column. The three-panel layout (left/center/480px-right) only
    exists in AppShell, which is used by /navigator, /journal, /notes,
    /portfolio, etc. — NOT by /home.
  Console/Network issues: none
  Evidence: home.tsx line 25 (import CompanionShell), CompanionShell.tsx lines 81–105
    (no RightPanelProvider), AppShell.tsx lines 238–262 (three-panel layout)
```

```
[CONFIRMED] CompanionGlassPanelV2 — dead code, never imported
  Tested: src/components/companion/CompanionGlassPanelV2.tsx + grep across src/
  Expected: this component is the experimental right-anchored chat panel
  Observed: The file exists but is NEVER imported anywhere in the codebase.
    Its JSDoc comment says "Activate with ?ui=experimental on /home" — but
    there is no ?ui=experimental route param (only ?ui=v1 exists). The
    actual experimental chat path uses ExperimentalChatView from
    ExperimentalHome.tsx, which is imported and used by home.tsx. This is
    dead code left from an earlier design iteration.
  Console/Network issues: none
  Evidence: grep "CompanionGlassPanelV2" → only its own file; home.tsx imports
    ExperimentalChatView instead
```

```
[REQUIRES LIVE VERIFY] Companion chat card — floating vs. fullscreen state
  Tested: src/routes/home.tsx (source read), experimental path structure
  Expected: chat card centered and floating (not full-screen reverted)
  Observed (code level): Experimental mode (?view=companion or clicking Companion
    nav item sets experimentalView="chat") renders ExperimentalChatView from
    ExperimentalHome.tsx. Whether this renders floating/centered or full-screen
    cannot be confirmed from source alone — it requires DOM inspection in a
    fresh private window on /home?view=companion in experimental mode.
    Note: the "full-screen reversion" report after PR #94 was likely a
    sessionStorage contamination artifact (contaminated tab showed legacy
    CompanionRail instead of experimental layout).
  Console/Network issues: unknown (requires browser)
  Evidence: home.tsx lines 1073–1074 (ExperimentalChatView render condition)
```

```
[DIVERGES] CompanionRail (Detail/Role/Mood tabs) — legacy mode only
  Tested: src/routes/home.tsx line 656–659, src/components/companion/CompanionRail.tsx
  Expected (per spec): right rail with single sticky collapsed tab behavior
    on both default and experimental paths
  Observed: CompanionRail is rendered only when `isLegacy` is true (line 657:
    `{isLegacy && <CompanionRail ... />}`). In experimental mode there is no
    equivalent right rail on /home. The three-tab behavior (Detail/Role/Mood)
    is legacy-only. AppShell routes have a different right panel (EntityPanel/
    ItemSidepanel via RightPanelProvider), but /home doesn't use AppShell.
  Console/Network issues: none
  Evidence: home.tsx line 657
```

---

## 2.3 Fullscreen Task View

---

```
[CONFIRMED] TaskFullscreenModal — modal-overlay implementation is live
  Tested: src/components/TaskFullscreenModal.tsx, src/store/fullscreenTaskStore.ts,
    src/components/AppShell.tsx (source read)
  Expected: ephemeral Zustand store, modal overlay, ~16px inset, ~10% backdrop
  Observed: All confirmed:
    - Store: Zustand (no persist), taskId: string | null, open(id), close()
    - Modal: position fixed; inset: 16px (all sides); zIndex: 50
    - Backdrop: position fixed; inset: 0; background rgba(0,0,0,0.10); zIndex: 40
    - Backdrop opacity and scale animate on open/close (0.15s ease-out)
    - Escape key closes via keydown listener
    - Mounted in AppShell (line 258) — renders on all AppShell routes
    - This IS the live implementation; route-based /task/$taskId is a separate
      standalone page for direct URL access only
  Console/Network issues: none
  Evidence: TaskFullscreenModal.tsx lines 1–63; AppShell.tsx line 258
```

```
[CONFIRMED] note_type='task' gate — present and functional
  Tested: src/routes/task.$taskId.tsx (source read)
  Expected: only note_type="task" opens in fullscreen; others show error
  Observed: TaskPageContent fetches the note then checks:
    `if (row.note_type !== "task") { setError("This item is not a task."); return; }`
    Non-task items show an error state with a Close button. Tasks created
    via NavigatorBrowser.createTask call createTaskNote() which explicitly
    sets note_type: "task" (navigator-api.ts line 183). So newly-created
    Navigator tasks will pass the gate.
  Console/Network issues: none
  Evidence: task.$taskId.tsx lines 154–159; navigator-api.ts line 183
```

```
[DIVERGES] Navigator task column entry to fullscreen — two-step, not direct
  Tested: src/components/navigator/NavigatorBrowser.tsx,
    src/components/sidepanel/ItemSidepanel.tsx (source read)
  Expected (per PR #89 fix description): clicking a task in the Navigator's
    task column opens fullscreen correctly
  Observed: NavigatorBrowser's openTask callback calls:
    openSidepanel({ id, kind: "note", title, noteType: task.note_type })
    This opens ItemSidepanel as a Sheet overlay (NOT the fullscreen modal
    directly). The fullscreen modal is only accessible from within the
    ItemSidepanel via a dropdown menu item gated on
    `item.kind === "note" && item.noteType === "task"`.
    So the flow is: click task → ItemSidepanel Sheet opens → user opens
    dropdown → clicks "Open fullscreen". It is NOT a single-click-to-fullscreen
    from the Navigator task list.
    The noteType field is correctly populated (task.note_type passed through),
    so the dropdown item DOES appear for tasks — but the UX is two steps.
  Console/Network issues: none
  Evidence: NavigatorBrowser.tsx lines 52–54; ItemSidepanel.tsx lines 992–1017
```

```
[GAP] FloatingAltitudeDial absent from /home (fullscreen task view on /home)
  Tested: src/components/TaskFullscreenModal.tsx, src/components/AppShell.tsx,
    src/components/CompanionShell.tsx (source read)
  Expected: TaskFullscreenModal mounted in AppShell
  Observed: TaskFullscreenModal mounts FloatingAltitudeDial inside
    TaskPageContent (task.$taskId.tsx line 393). AppShell also mounts
    FloatingAltitudeDial (line 257). But /home uses CompanionShell, which
    neither mounts TaskFullscreenModal nor FloatingAltitudeDial.
    If a task is opened from /home via any path, there would be no fullscreen
    modal available (CompanionShell does not mount it).
  Console/Network issues: none
  Evidence: CompanionShell.tsx (no TaskFullscreenModal import),
    AppShell.tsx line 257–258
```

---

## 2.4 Logbook / Journal

---

```
[CONFIRMED] Sidebar label — "Logbook" is the parent; "My Journal" and "My Notes" are subitems
  Tested: src/components/AppSidebarExperimental.tsx (source read)
  Expected (per Phase 1 IA): Logbook as single parent with sub-items
  Observed: CONFIRMED in PROJECT_NAV:
    { title: "logbook", label: "Logbook", url: "/journal" }
    Subitems when expanded: "My Journal" → /journal, "My Notes" → /notes
    Notes is NOT under Navigator. This matches the Phase 1 IA decision.
    No contradiction with 2.1 — the sidebar label is already "Logbook."
  Console/Network issues: none
  Evidence: AppSidebarExperimental.tsx PROJECT_NAV array
```

```
[DIVERGES] Journal route page title — still "Journal", not "Logbook"
  Tested: src/routes/journal.tsx (source read)
  Expected: naming consistent with sidebar ("Logbook")
  Observed: Route head meta still declares title "Journal — Xcamp Journal"
    (journal.tsx line 14). Browser tab will say "Journal." Sidebar says
    "Logbook." The naming is inconsistent between sidebar label and page
    identity. Not a functional regression but a user-visible naming mismatch.
  Console/Network issues: none
  Evidence: journal.tsx lines 14–15
```

```
[DIVERGES] Phase 2 Journal features — partially present, not all absent
  Tested: src/components/JournalFlow.tsx (source read; ~970 lines)
  Expected (per kickoff brief): Phase 2 features absent: history list,
    suggestion cards, Apply/Dismiss/Open, search/filter/sort, mobile second-view
  Observed: Several "Phase 2" features ARE present in JournalFlow:
    PRESENT: SessionHistoryView (history list with status badges)
    PRESENT: TopicCard with Apply/Dismiss actions
    PRESENT: EntityTypeSelector (objective/task/note/resource picker)
    PRESENT: InlineVoice (browser speech recognition)
    PRESENT: applyTopic() that calls confirmSession + commitSession
    ABSENT (search/filter/sort within history): not found in JournalFlow
    ABSENT (mobile second-view): not found
    ABSENT (Open action as distinct from Apply): appears to be Apply-only
  This needs reconciliation with the Phase 2 scope document — some features
  listed as "Phase 2" appear to have shipped. If the brief's Phase 2 scope
  list was written before these features landed, the list is stale.
  Console/Network issues: unknown (requires live data to test Apply/Dismiss flow)
  Evidence: JournalFlow.tsx (full read, ~970 lines)
```

```
[CONFIRMED] No broken Phase 2 scaffolding visible
  Tested: src/components/JournalFlow.tsx (source read)
  Expected: check for partial/broken Phase 2 code rendering incorrectly
  Observed: JournalFlow appears structurally complete for what it implements.
    No obviously orphaned state machines, dead render branches, or
    partial form scaffolding found. The three screens (input/cards/history)
    each have clear entry/exit conditions.
  Console/Network issues: none (requires live verify to confirm no glitchy renders)
  Evidence: JournalFlow.tsx full read
```

---

## 2.5 Navigator (network graph + roadmap)

---

```
[DIVERGES] Navigator graph implementation — ReactFlow radial, NOT D3 force simulation
  Tested: src/components/navigator/NavigatorGraph.tsx (source read)
  Expected (per prior documentation): D3 force simulation (network graph)
  Observed: The Navigator's network view uses @xyflow/react (ReactFlow), NOT D3.
    Layout is a hand-calculated RADIAL arrangement:
      - Project hub node at (500, 350)
      - Objectives at radius 230 around hub (equidistant by angle)
      - Tasks at radius 390, spread angularly around their objective
      - Max 6 tasks per objective displayed
    Node positions persist in localStorage (key: xcamp-nav-graph:{projectId})
    "Arrange" button resets to default radial layout.
    No D3 is imported anywhere in the codebase. There IS a hand-rolled force
    simulation in src/components/sidepanel/ItemGraph.tsx (100 iterations,
    REPEL=2800, spring, gravity, alpha decay) but this renders in the item
    sidepanel, not the Navigator.
  Console/Network issues: none (requires live verify for actual render quality)
  Evidence: NavigatorGraph.tsx (full read, 670 lines); no d3 in package.json
```

```
[REQUIRES LIVE VERIFY] Navigator — which version renders post-PR #94 on default path
  Tested: src/routes/navigator.tsx, src/components/navigator/NavigatorGraph.tsx,
    NavigatorBrowser.tsx (source read)
  Expected (per kickoff brief): route was "reverted" post-PR #94 — verify what
    renders
  Observed (code level): The navigator route uses AppShell and shows
    NavigatorBrowser (default, ?view=browser) or NavigatorGraph (?view=network).
    No legacy branch; this route has no isLegacy check. Default and
    ?nav=experimental both render identically (nav param is accepted but unused).
    Whether this is the "reverted" version or the new version cannot be
    confirmed from source — it requires live click-through.
  Console/Network issues: none (source level)
  Evidence: navigator.tsx lines 9–75
```

```
[GAP] Roadmap swimlane — does not exist
  Tested: src/routes/ai-plan.tsx, entire codebase grep (source read)
  Expected: roadmap swimlane view with task dates
  Observed: The ai-plan route renders a single placeholder:
    "AI-generated project planning and roadmapping — coming soon."
    No swimlane component, no date-based layout, no Gantt-like view anywhere.
  Console/Network issues: none
  Evidence: ai-plan.tsx full read; grep for "roadmap", "swimlane", "gantt" → no matches
```

```
[GAP] Task scheduling dates — absent from schema and all Navigator components
  Tested: src/lib/navigator-api.ts (NavTask interface), Supabase types,
    NavigatorBrowser.tsx, NavigatorGraph.tsx (source read)
  Expected (per kickoff brief): task_schedule side table or date fields on notes
    "never completed" — verify current behavior
  Observed: CONFIRMED GAP.
    NavTask interface: { id, title, note_type, done } — no date fields.
    notes table schema: no due_date, start_date, deadline, or scheduled_date.
    The only date-like fields (start_date, completion_deadline) belong to
    OBJECTIVES, not tasks/notes.
    task_schedule table: does not exist anywhere in the codebase or schema.
    Neither NavigatorBrowser nor NavigatorGraph query, display, or filter on
    any task date. There is nothing to show — no blank dates, no wrong dates,
    just no dates at all.
  Console/Network issues: none
  Evidence: navigator-api.ts NavTask interface; Supabase types grep; NavigatorGraph.tsx
```

---

## 2.6 Altitude System

---

```
[CONFIRMED] FloatingAltitudeDial and altitudeStore live and functional (on AppShell routes)
  Tested: src/components/altitude/FloatingAltitudeDial.tsx,
    src/store/altitudeStore.ts (source read)
  Expected: present and functional
  Observed: CONFIRMED on AppShell routes. FloatingAltitudeDial is a fixed
    bottom-right pill button. Three altitude states: 0=Surface/Glide (emerald),
    1=Working/Cruise (teal), 2=Deep/Cockpit (blue). Click cycles 0→1→2→0.
    Altitude also controls TaskPageContent layout (altitude 0 = editor only,
    altitude 1 = editor + linked objectives, altitude 2 = editor + linked +
    meta strip).
    ABSENT from /home — CompanionShell does not mount FloatingAltitudeDial.
  Console/Network issues: none
  Evidence: FloatingAltitudeDial.tsx, altitudeStore.ts, AppShell.tsx line 257
```

```
[CONFIRMED] localStorage["nox-founder-altitude"] persists correctly across reload
  Tested: src/store/altitudeStore.ts (source read)
  Expected: localStorage key "nox-founder-altitude" persists
  Observed: Zustand persist middleware with name: 'nox-founder-altitude'.
    This writes to localStorage["nox-founder-altitude"]. Confirmed correct.
    Default altitude is 1 (Working/Cruise) as set by DEFAULT_ALTITUDE in
    src/entities/altitude.ts.
  Console/Network issues: none
  Evidence: altitudeStore.ts lines 11–21
```

```
[DIVERGES] FloatingAltitudeDial uses hardcoded Tailwind classes, not --skin-* tokens
  Tested: src/components/altitude/FloatingAltitudeDial.tsx (source read)
  Expected: consistent with theme token system
  Observed: Button colors are Tailwind utilities (bg-emerald-600 dark:bg-emerald-500,
    bg-teal-600 dark:bg-teal-500, bg-blue-600 dark:bg-blue-500). These are
    hardcoded Tailwind color utilities that do NOT participate in the --skin-*
    token system. This means the dial's colors will not update if the skin
    accent color changes. Low-severity cosmetic issue.
  Console/Network issues: none
  Evidence: FloatingAltitudeDial.tsx lines 17–22
```

---

## 2.7 Portfolio View

---

```
[CONFIRMED] Portfolio token architecture — var(--skin-*) used consistently
  Tested: src/features/portfolio/PortfolioView.tsx,
    src/features/portfolio/PortfolioProjectCard.tsx,
    src/features/portfolio/ProjectStubPanel.tsx (source read)
  Expected: two-skin token architecture renders correctly, no JS token
    destructuring regressions
  Observed: All three files use var(--skin-*) tokens for backgrounds, borders,
    text, and accent colors. No hardcoded hex in layout-critical paths.
    One intentional rgba(0,0,0,0.45) in the role badge overlay over project
    cover images — acceptable as it overlays an image.
    No JS token destructuring anywhere in Portfolio — all tokens are CSS var()
    references and will silently fall to initial/inherit if undefined.
  Console/Network issues: none (requires live verify for actual render)
  Evidence: PortfolioView.tsx, PortfolioProjectCard.tsx, ProjectStubPanel.tsx (full read)
```

```
[DIVERGES] --skin-font-head token — referenced but not defined in styles.css
  Tested: src/styles.css, src/features/portfolio/PortfolioView.tsx line 192,
    src/features/portfolio/PortfolioProjectCard.tsx line 89 (source read)
  Expected: skin token typography renders correctly
  Observed: var(--skin-font-head) is referenced for project name typography in
    PortfolioView and PortfolioProjectCard but is NOT defined in src/styles.css.
    It only exists in vendor/ui/src/skin/apply.ts (written by applySkin()).
    applySkin() is never called in the main app — no SkinProvider or equivalent
    exists. The browser silently falls through to the inherited body font.
    No crash, but the intended "playful vs. scientific" typography distinction
    does not render.
  Console/Network issues: none (silent degradation)
  Evidence: styles.css (full review — no --skin-font-head); PortfolioView.tsx line 192
```

```
[GAP] Two-skin vendor system not wired to app
  Tested: vendor/ui/src/skin/ (source read), main app (grep for applySkin)
  Expected: scientific/playful skin switching functional
  Observed: vendor/ui/src/skin/ defines a complete two-axis (paradigm × tone)
    skin system with 6 registered skins (PLATFORM_SCIENTIFIC, PLATFORM_PLAYFUL,
    COMPANION_SCIENTIFIC, COMPANION_PLAYFUL, CANVAS_SCIENTIFIC, CANVAS_PLAYFUL).
    The applySkin() function exists and would write all --skin-* tokens to the
    DOM. However, applySkin() is never called from the main app. No SkinProvider
    component exists in the app. The skin system is fully defined but
    disconnected from runtime — the app runs on the static CSS-defined tokens
    in src/styles.css only.
  Console/Network issues: none
  Evidence: grep "applySkin" in src/ → zero results
```

---

## 2.8 Theme System

---

```
[CONFIRMED] useTheme() / resolved: light=Xcamp, dark=Nox — consistent
  Tested: src/lib/theme.tsx, src/lib/brand.ts (source read)
  Expected: light resolved = Xcamp branding, dark resolved = Nox branding
  Observed: CONFIRMED.
    ThemeProvider persists mode to localStorage["xcamp-theme"].
    Default mode is "light" (Xcamp) — not "system".
    resolved === "dark" → Nox name, Nox logo, Nox icon, purple accent (#b689e6).
    resolved === "light" → Xcamp name, Xcamp logo, Xcamp icon, teal accent (#4de0c1).
    applyTheme() toggles the "dark" CSS class on document.documentElement.
    useBrand() derives from useTheme().resolved — correctly wired.
  Console/Network issues: none
  Evidence: theme.tsx, brand.ts (full read); styles.css :root and .dark blocks
```

```
[CONFIRMED] Theme token consistency — all audited routes use var(--skin-*) tokens
  Tested: AppShell.tsx, CompanionShell.tsx, ProjectEntryScreen.tsx,
    PortfolioView.tsx, NavigatorBrowser.tsx, NavigatorGraph.tsx,
    journal.tsx / JournalFlow.tsx (source read)
  Expected: no route silently diverges from theme token system
  Observed: All routes use var(--skin-*) tokens for backgrounds, text, borders,
    and accents. No route hardcodes a competing color system. FloatingAltitudeDial
    is the only component that uses Tailwind hardcoded colors instead of skin
    tokens (noted in 2.6).
  Console/Network issues: none (requires live verify across all routes)
  Evidence: consistent var(--skin-*) usage across all files read
```

---

## 2.9 General Regression Sweep

---

```
[DIVERGES] Default-path vs. ?nav=experimental — render identically on every route
  Tested: home.tsx, navigator.tsx, AppSidebarExperimental.tsx (source read)
  Expected: these should differ IF ?nav=experimental is meaningful; or they
    should be documented as identical
  Observed: On every route tested (home, navigator, journal), the default path
    and ?nav=experimental render IDENTICALLY. The param is vestigial. This is
    exactly the class of invisible-divergence bug the kickoff brief warned about:
    a tester who expects a mode switch from adding ?nav=experimental will not
    get one, and may draw wrong conclusions about what "experimental" means.
  Console/Network issues: none
  Evidence: All route validators accept nav param but no component reads it for
    rendering decisions
```

```
[DIVERGES] CompanionShell vs. AppShell capability gap — /home missing core features
  Tested: CompanionShell.tsx, AppShell.tsx (source read)
  Expected: /home has full experimental feature set
  Observed: /home uses CompanionShell, which is missing:
    (1) RightPanelProvider / RightPanelSlot — no right panel on /home
    (2) FloatingAltitudeDial — altitude dial absent on /home
    (3) TaskFullscreenModal — fullscreen task modal not mounted on /home
    These features are only available on AppShell routes (/navigator, /journal,
    /notes, /portfolio, etc.).
  Console/Network issues: none
  Evidence: CompanionShell.tsx (no imports for above); AppShell.tsx lines 254–259
```

```
[DIVERGES] CompanionGlassPanelV2 — dead code, never reachable
  Tested: src/components/companion/CompanionGlassPanelV2.tsx + grep (source read)
  Expected: component is either active or cleanly absent
  Observed: File exists (381 lines) but is imported by no file in the codebase.
    Its JSDoc says "Activate with ?ui=experimental" — a param that does not
    exist in the route validator. This file is unreachable dead code.
  Console/Network issues: none
  Evidence: grep "CompanionGlassPanelV2" → only its own file
```

```
[DIVERGES] Multiple silent console.error patterns — no user-visible feedback
  Tested: src/routes/home.tsx, src/components/sidepanel/ItemSidepanel.tsx,
    src/components/EntityPanel.tsx, src/lib/backcaster-api.ts (source read)
  Expected: error states surfaced to user
  Observed: 
    - home.tsx: 4 Vox/AI call failures caught with console.error only (lines
      343, 509, 533, 570) — user sees nothing if AI calls fail
    - ItemSidepanel.tsx: 7 silent catch patterns (.catch(console.error) at
      lines 564, 576, 979; console.error at 595, 765, 777, 984)
    - EntityPanel.tsx: 6 silent catch / console.error patterns
    - backcaster-api.ts:339: silently swallows case where /generate returns
      no usable tree
  None of these produce console.warn (yellow) — all console.error (red), so
  they'd be visible in DevTools but invisible to users.
  Console/Network issues: confirmed in source; requires live DevTools to observe
  Evidence: all files cited above
```

---

## Priority List for Next Session

Ordered by user-facing severity (broken > missing > cosmetic). This list names symptoms only — no fixes proposed.

### Broken (user-impacting, happens now)

1. **CompanionShell/AppShell capability gap** — FloatingAltitudeDial, TaskFullscreenModal, and the right panel are entirely absent from `/home`, which uses CompanionShell. Any user on the home route cannot access altitude controls or fullscreen task view.

2. **No escape from `?ui=v1` legacy mode** — sessionStorage write-only trap is live, no UI escape. Any contaminated tab is permanently in legacy mode. Root cause of many reported "regressions."

3. **`?nav=experimental` is a no-op** — param accepted by validators, ignored everywhere. Creates systematic test confusion (tester adds param expecting mode switch; gets none).

4. **Navigator task fullscreen is two-step, not one-step** — clicking a task in Navigator opens ItemSidepanel; fullscreen requires a second action (dropdown). If the intended UX from PR #89 was single-click-to-fullscreen, this is not what shipped.

### Missing (functional gaps, not crashes)

5. **Task scheduling dates absent** — no schema fields, no UI for task dates. NavTask has no date fields. Roadmap/swimlane is a "coming soon" stub only.

6. **Two-skin vendor system disconnected** — `applySkin()` never called; `--skin-font-head` and all typography/radius/motion vendor tokens are undefined at runtime.

### Cosmetic / consistency (low severity)

7. **Journal route title mismatch** — sidebar says "Logbook", browser tab says "Journal — Xcamp Journal."

8. **FloatingAltitudeDial uses hardcoded Tailwind colors** — does not participate in `--skin-*` token system.

9. **CompanionGlassPanelV2 dead code** — 381-line file that can never be reached; should be removed.

---

### Requires live verification before closing

The following cannot be confirmed from source and MUST be click-tested in fresh private windows with DevTools:

- **ProjectEntryScreen actual rendering** — Fabian's "as bad as before" claim. Source looks correct; live DOM inspection needed on both light and dark mode.
- **ExperimentalChatView companion panel** — floating vs. full-screen layout on `/home?view=companion`.
- **Navigator post-PR #94** — which version of Navigator actually renders live on `/navigator` (default path, fresh window).
- **Console/Network errors** — actual runtime errors on each route cannot be confirmed from source; requires live DevTools Console + Network tab.
- **JournalFlow Phase 2 features** — Apply/Dismiss/history flow requires live data to test the full loop.
