// src/components/demo/navigator/NavigatorBoardView.tsx
//
// The Board sub-view — content unchanged in substance from the Navigator
// route this replaces (objectives grouped by lifecycle status, click opens
// the shared sidepanel), just re-nested under Navigator's new sub-nav and
// scoped to Solari Energy instead of every project ecosystem-wide. See the
// route file for why: the rest of the Founder demo (Home, Companion, Goals,
// Dashboard, Readiness) is single-project-scoped and the Founder nav now has
// a (Solari-only) project switcher — an ecosystem-wide Board next to three
// new Solari-scoped sibling views would make that mismatch worse, not
// better. Flagged as a judgment call, not silently assumed — see session
// notes.
import { getObjectivesByProject } from "@/fixtures/objectives";
import { getProjectById } from "@/fixtures/projects";
import { DEMO_FOUNDER_PROJECT_ID } from "@/fixtures/pitch";
import type { ObjectiveStatus } from "@/fixtures/types";
import { useSidepanel } from "@/contexts/sidepanel";

const COLUMNS: { status: ObjectiveStatus; label: string }[] = [
  { status: "suggested", label: "Suggested" },
  { status: "open", label: "Open" },
  { status: "in_progress", label: "In progress" },
  { status: "done", label: "Done" },
];

export function NavigatorBoardView() {
  const { open: openSidepanel } = useSidepanel();
  const project = getProjectById(DEMO_FOUNDER_PROJECT_ID);
  const objectives = getObjectivesByProject(DEMO_FOUNDER_PROJECT_ID);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
      <h1 className="mb-1.5 text-xl font-semibold tracking-tight text-foreground">Navigator</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        {project?.name ?? "This project"}'s objectives, grouped by where they sit in the lifecycle.
      </p>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {COLUMNS.map((col) => {
          const colObjectives = objectives.filter((o) => o.status === col.status);
          return (
            <div key={col.status}>
              <h3 className="mb-2 text-xs font-semibold text-muted-foreground">
                {col.label} <span className="font-normal">({colObjectives.length})</span>
              </h3>
              <div className="flex flex-col gap-2">
                {colObjectives.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => openSidepanel({ id: o.id, kind: "objective", title: o.title })}
                    className="rounded-md border p-3 text-left transition-colors hover:border-[var(--skin-accent)]"
                    style={{ borderColor: "var(--skin-line)", background: "var(--skin-surface)" }}
                  >
                    <b className="block text-sm font-semibold text-foreground">{o.title}</b>
                    <small className="text-xs text-muted-foreground">{o.dimension}</small>
                  </button>
                ))}
                {colObjectives.length === 0 && (
                  <p className="text-xs text-muted-foreground">Nothing here.</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
