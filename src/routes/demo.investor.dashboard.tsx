// Investor Dashboard — numbers-led counterpart to Home (activity-led). KPI
// tiles over the ecosystem, then a per-project table of the metrics an
// investor actually asks about. No feed here on purpose: that is Home's job,
// and duplicating it was the risk worth avoiding when B4 gave this persona
// three top-level screens instead of one.
import { createFileRoute } from "@tanstack/react-router";
import { ECOSYSTEM_METRICS, PROJECT_METRICS } from "@/fixtures/metrics";
import { getProjectById } from "@/fixtures/projects";

export const Route = createFileRoute("/demo/investor/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Xcamp" }] }),
  component: InvestorDashboardPage,
});

const TILES = [
  { v: ECOSYSTEM_METRICS.activeProjects, k: "Active projects" },
  { v: ECOSYSTEM_METRICS.totalObjectives, k: "Objectives" },
  { v: `${ECOSYSTEM_METRICS.avgProgressPct}%`, k: "Avg progress" },
  { v: `${ECOSYSTEM_METRICS.avgQualityPct}%`, k: "Avg quality" },
];

function InvestorDashboardPage() {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
      <h1 className="mb-1.5 text-xl font-semibold tracking-tight text-foreground">Dashboard</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Where the portfolio stands right now, project by project.
      </p>

      <div className="mb-7 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        {TILES.map((t) => (
          <div
            key={t.k}
            className="p-3.5"
            style={{
              border: "1px solid var(--skin-line)",
              borderRadius: "var(--xr-lg, 10px)",
              background: "var(--skin-surface)",
            }}
          >
            <div className="text-xl font-semibold tabular-nums text-foreground">{t.v}</div>
            <div className="mt-0.5 text-xs text-muted-foreground">{t.k}</div>
          </div>
        ))}
      </div>

      <h2 className="mb-2.5 text-sm font-semibold text-muted-foreground">By project</h2>
      <div
        style={{
          border: "1px solid var(--skin-line)",
          borderRadius: "var(--xr-lg, 10px)",
          overflow: "hidden",
          background: "var(--skin-surface)",
        }}
      >
        {PROJECT_METRICS.map((m, i) => {
          const project = getProjectById(m.projectId);
          if (!project) return null;
          return (
            <div
              key={m.projectId}
              className="flex items-center gap-3 px-3.5 py-2.5 text-sm"
              style={{
                borderTop: i === 0 ? "none" : "1px solid var(--skin-line-soft)",
              }}
            >
              <span
                aria-hidden
                style={{
                  width: 8,
                  height: 8,
                  flexShrink: 0,
                  borderRadius: "50%",
                  background: project.color,
                }}
              />
              <span className="min-w-0 flex-1 truncate font-medium text-foreground">
                {project.name}
              </span>
              <span className="w-20 shrink-0 text-right tabular-nums text-muted-foreground">
                {m.progressPct}% done
              </span>
              <span className="w-24 shrink-0 text-right tabular-nums text-muted-foreground">
                {m.qualityPct}% quality
              </span>
              <span className="w-20 shrink-0 text-right tabular-nums text-muted-foreground">
                {m.proofTotal} proofs
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
