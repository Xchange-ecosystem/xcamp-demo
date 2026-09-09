// P1.1 Part 5 — lightweight Navigator view: real OBJECTIVES grouped by
// lifecycle status. xcamp-nox-founder-app's NavigatorBrowser.tsx wasn't
// reachable from this session (out of GitHub scope for this repo set — see
// P1.1 session report's Part 5 findings), so this is a compact grouped-list
// read of the shared fixtures rather than a port of that component.
//
// B4: the column layout that used to be inlined here now lives in
// NavigatorBoard, shared with the Investor Navigator and Club Deal Finder.
// Cards moved onto the --xr radius family at the same time, matching the rest
// of the demo's card-scale work.
import { createFileRoute } from "@tanstack/react-router";
import { NavigatorBoard, type BoardColumn } from "@/components/demo/NavigatorBoard";
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
  const columns: BoardColumn[] = COLUMNS.map((col) => {
    const objectives = OBJECTIVES.filter((o) => o.status === col.status);
    return {
      key: col.status,
      label: col.label,
      count: objectives.length,
      children: objectives.map((o) => (
        <div
          key={o.id}
          className="p-3"
          style={{
            border: "1px solid var(--skin-line)",
            borderRadius: "var(--xr-lg, 10px)",
            background: "var(--skin-surface)",
          }}
        >
          <b className="block text-sm font-semibold text-foreground">{o.title}</b>
          <small className="text-xs text-muted-foreground">
            {getProjectById(o.projectId)?.name}
          </small>
        </div>
      )),
    };
  });

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
      <h1 className="mb-1.5 text-xl font-semibold tracking-tight text-foreground">Navigator</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Every objective across your projects, grouped by where it sits in the lifecycle.
      </p>

      <NavigatorBoard columns={columns} />
    </div>
  );
}
