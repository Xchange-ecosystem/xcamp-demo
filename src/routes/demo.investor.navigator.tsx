// Investor Navigator — the same objective-lifecycle board the Founder gets
// (src/routes/demo.founder.navigator.tsx), read through an investor lens:
// every card carries its proof count and, where an assessor has scored it,
// its evaluation. Read-only by construction — there is no edit affordance
// here, which is the point.
import { createFileRoute } from "@tanstack/react-router";
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
  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
      <h1 className="mb-1.5 text-xl font-semibold tracking-tight text-foreground">Navigator</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Every objective across the projects you follow, with the evidence filed against it.
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
                    <div className="mt-2 flex items-center gap-2 text-[11px]">
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
                    </div>
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
