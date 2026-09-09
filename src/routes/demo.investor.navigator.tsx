// Investor Navigator — the same objective-lifecycle board the Founder gets
// (src/routes/demo.founder.navigator.tsx), sharing NavigatorBoard, read
// through an investor lens: every card carries its proof count, its
// evaluation where an assessor has scored it, and the four-eyes credibility
// badge where completion was externally signed off. Read-only by
// construction — there is no edit affordance here, which is the point.
import { createFileRoute } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import { NavigatorBoard, type BoardColumn } from "@/components/demo/NavigatorBoard";
import { OBJECTIVES } from "@/fixtures/objectives";
import { getProjectById } from "@/fixtures/projects";
import type { ObjectiveStatus } from "@/fixtures/types";

export const Route = createFileRoute("/demo/investor/navigator")({
  head: () => ({ meta: [{ title: "Navigator — Xcamp" }] }),
  component: InvestorNavigatorPage,
});

const COLUMNS: { status: ObjectiveStatus; label: string }[] = [
  { status: "suggested", label: "Suggested" },
  { status: "open", label: "Open" },
  { status: "in_progress", label: "In progress" },
  { status: "done", label: "Done" },
];

function InvestorNavigatorPage() {
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
          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
            <span style={{ color: "var(--skin-ink-faint)" }}>
              {o.proofCount} proof{o.proofCount === 1 ? "" : "s"}
            </span>
            {o.evaluationPct !== null && (
              <span
                className="tabular-nums"
                style={{
                  padding: "1px 7px",
                  borderRadius: "var(--xr-pill, 999px)",
                  background: "var(--skin-accent-soft)",
                  color: "var(--skin-ink)",
                  fontWeight: 600,
                }}
              >
                {o.evaluationPct}%
              </span>
            )}
            {o.hasExternalAssessor && (
              <span
                className="inline-flex items-center gap-1"
                title="Completion signed off under four-eyes / external assessment"
                style={{
                  padding: "1px 7px",
                  borderRadius: "var(--xr-pill, 999px)",
                  border: "1px solid var(--skin-line)",
                  color: "var(--skin-ink-soft)",
                }}
              >
                <ShieldCheck size={11} />
                Four-eyes
              </span>
            )}
          </div>
        </div>
      )),
    };
  });

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
      <h1 className="mb-1.5 text-xl font-semibold tracking-tight text-foreground">Navigator</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Every objective across the projects you follow, with the evidence filed against it.
      </p>

      <NavigatorBoard columns={columns} />
    </div>
  );
}
