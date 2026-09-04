// P1.1 Part 5 — lightweight Navigator view: real OBJECTIVES grouped by
// lifecycle status. xcamp-nox-founder-app's NavigatorBrowser.tsx wasn't
// reachable from this session (out of GitHub scope for this repo set — see
// P1.1 session report's Part 5 findings), so this is a compact grouped-list
// read of the shared fixtures rather than a port of that component.
import { createFileRoute } from "@tanstack/react-router";
import { OBJECTIVES } from "@/fixtures/objectives";
import { getProjectById } from "@/fixtures/projects";
import type { ObjectiveStatus } from "@/fixtures/types";

export const Route = createFileRoute("/demo/founder/navigator")({
  head: () => ({ meta: [{ title: "Navigator — Xcamp" }] }),
  component: FounderNavigatorPage,
});

const COLUMNS: { status: ObjectiveStatus; label: string }[] = [
  { status: "suggested", label: "Suggested" },
  { status: "open", label: "Open" },
  { status: "in_progress", label: "In progress" },
  { status: "done", label: "Done" },
];

function FounderNavigatorPage() {
  return (
    <div className="px-6 py-6">
      <h1 className="mb-1.5 text-xl font-semibold tracking-tight text-foreground">Navigator</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Every objective across your projects, grouped by where it sits in the lifecycle.
      </p>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {COLUMNS.map((col) => {
          const objectives = OBJECTIVES.filter((o) => o.status === col.status);
          return (
            <div key={col.status}>
              <h3 className="mb-2 text-xs font-semibold text-muted-foreground">
                {col.label} <span className="font-normal">({objectives.length})</span>
              </h3>
              <div className="flex flex-col gap-2">
                {objectives.map((o) => (
                  <div
                    key={o.id}
                    className="rounded-md border p-3"
                    style={{ borderColor: "var(--skin-line)" }}
                  >
                    <b className="block text-sm font-semibold text-foreground">{o.title}</b>
                    <small className="text-xs text-muted-foreground">
                      {getProjectById(o.projectId)?.name}
                    </small>
                  </div>
                ))}
                {objectives.length === 0 && (
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
