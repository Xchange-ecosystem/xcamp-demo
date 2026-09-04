// P1.1 Part 5 — lightweight Dashboard view: ecosystem KPI tiles + a recent
// project-update feed. Reuses the P1.0 Card Feed component + its
// investorUpdateConfig (built for P1.2) rather than forking a Founder-only
// feed for what's meant to stay a shallow, secondary demo screen.
import { createFileRoute } from "@tanstack/react-router";
import { CardFeed } from "@/components/card-feed/CardFeed";
import { investorUpdateConfig } from "@/components/card-feed/configs";
import { ECOSYSTEM_METRICS } from "@/fixtures/metrics";
import { getFeedByKind } from "@/fixtures/feed";

export const Route = createFileRoute("/demo/founder/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Xcamp" }] }),
  component: FounderDashboardPage,
});

function FounderDashboardPage() {
  const updates = getFeedByKind("project_update").slice(0, 4);

  return (
    <div className="px-6 py-6">
      <h1 className="mb-1.5 text-xl font-semibold tracking-tight text-foreground">Dashboard</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Where your projects stand, in the terms an investor asks about.
      </p>

      <div className="mb-7 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        {[
          { v: ECOSYSTEM_METRICS.activeProjects, k: "Active projects" },
          { v: ECOSYSTEM_METRICS.totalObjectives, k: "Objectives" },
          { v: ECOSYSTEM_METRICS.totalTasksCompleted, k: "Tasks completed" },
          { v: `${ECOSYSTEM_METRICS.avgQualityPct}%`, k: "Avg. certified quality" },
        ].map((tile) => (
          <div
            key={tile.k}
            className="rounded-md p-3.5"
            style={{ background: "var(--skin-raised, var(--muted))" }}
          >
            <div className="text-2xl font-semibold tracking-tight">{tile.v}</div>
            <div className="mt-0.5 text-xs text-muted-foreground">{tile.k}</div>
          </div>
        ))}
      </div>

      <h2 className="mb-2.5 text-sm font-semibold text-muted-foreground">Recent updates</h2>
      <CardFeed items={updates} config={investorUpdateConfig} />
    </div>
  );
}
