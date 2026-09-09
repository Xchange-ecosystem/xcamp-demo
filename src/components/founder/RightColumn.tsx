// Part 3 — right-column metrics + people panel. Ecosystem-scoped rather
// than single-project (P1.1 Phase 0 note): the mockup's right column is
// scoped to one active project, but src/fixtures' 7 action items spread
// across 5 different projects/founders (by design, per fixtures/README.md
// — enough spread for the Investor/Operator screens), so pinning this
// Founder screen to one project would leave most of the Part 2 feed
// looking orphaned from the Part 3 panel. Scoping both to the same
// ecosystem-wide view keeps them coherent.
//
// CC follow-up (warn-token/demo-scope session): the "Objective progress"
// bar below is the one exception, scoped to DEMO_FOUNDER_PROJECT_ID and
// labelled as such — after the Pitch session gave proj-1 a real completed
// history, this bar showed one project's numbers as if they were
// ecosystem-wide, which reads as a fabricated portfolio result. The
// action-item feed above it stays ecosystem-wide per the rationale above;
// only this bar changed.
import { AlertTriangle } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { avatarColor, initials } from "@/lib/avatarColor";
import { ECOSYSTEM_METRICS } from "@/fixtures/metrics";
import { getObjectivesByProject, TASKS } from "@/fixtures/objectives";
import { DEMO_FOUNDER_PROJECT_ID } from "@/fixtures/pitch";
import type { Task } from "@/fixtures/types";
import { PEOPLE } from "@/fixtures/people";
import { getProjectById } from "@/fixtures/projects";

// Agreement-lifecycle labels for the progress legend below (P1-CORR Part 1)
// — a presentation-only relabeling of Objective.status, which keeps its
// original values and meaning everywhere else. "open" and "suggested" both
// mean nothing has been formalized yet, so they share one bucket here.
const AGREEMENT_LABEL: Record<string, string> = {
  done: "Complete",
  in_progress: "Under agreement",
  open: "Still a sketch",
  suggested: "Still a sketch",
};
const LABEL_ORDER = ["Complete", "Under agreement", "Still a sketch"] as const;
const LABEL_COLOR: Record<string, string> = {
  Complete: "var(--skin-good)",
  "Under agreement": "var(--skin-accent)",
  "Still a sketch": "var(--skin-line)",
};

// P1 is a fixed presentation dataset dated 3–4 September 2026. Using the
// viewer's real clock makes the "This week" panel silently empty as the demo
// ages, so date-only comparisons are anchored to the fixture timeline.
const DEMO_TODAY = "2026-09-04";
const DEMO_WEEK_END = "2026-09-11";

// Urgency coloring (P1-CORR visual cues) — derived from Task.dueDate, the
// real field this fixture already carries, not an invented one. "Overdue"
// only appears once a real task's dueDate falls before DEMO_TODAY.
type Urgency = "overdue" | "soon" | "upcoming";
const URGENCY_ORDER: Record<Urgency, number> = { overdue: 0, soon: 1, upcoming: 2 };
const URGENCY_STYLE: Record<Urgency, { color: string; label: string }> = {
  overdue: { color: "var(--skin-bad)", label: "Overdue" },
  soon: { color: "var(--skin-warn)", label: "Due soon" },
  upcoming: { color: "var(--skin-ink-faint, var(--muted-foreground))", label: "Upcoming" },
};

function urgencyOf(dueDate: string): Urgency {
  if (dueDate < DEMO_TODAY) return "overdue";
  if (dueDate <= DEMO_WEEK_END) return "soon";
  return "upcoming";
}

export function RightColumn() {
  const founderProject = getProjectById(DEMO_FOUNDER_PROJECT_ID);
  const founderObjectives = getObjectivesByProject(DEMO_FOUNDER_PROJECT_ID);
  const counts = LABEL_ORDER.map((label) => ({
    label,
    count: founderObjectives.filter((o) => AGREEMENT_LABEL[o.status] === label).length,
  })).filter((c) => c.count > 0);
  const total = founderObjectives.length;

  const risks: (Task & { urgency: Urgency })[] = TASKS.filter(
    (t) => t.status === "active" && t.priority === "high" && t.dueDate,
  )
    .map((t) => ({ ...t, urgency: urgencyOf(t.dueDate!) }))
    .sort(
      (a, b) =>
        URGENCY_ORDER[a.urgency] - URGENCY_ORDER[b.urgency] || a.dueDate!.localeCompare(b.dueDate!),
    )
    .slice(0, 3);

  const people = PEOPLE.filter((p) => p.role === "investor" || p.role === "collaborator").slice(
    0,
    3,
  );

  return (
    <aside className="flex min-h-0 w-full max-w-[320px] shrink-0 flex-col gap-6 overflow-y-auto">
      <section>
        <h2 className="mb-2.5 text-sm font-semibold text-muted-foreground">Objective progress</h2>
        <div className="mb-2.5 flex h-2 gap-0.5 overflow-hidden rounded-full">
          {counts.map((c) => (
            <span key={c.label} style={{ flex: c.count, background: LABEL_COLOR[c.label] }} />
          ))}
        </div>
        <div className="flex flex-col gap-1.5">
          {counts.map((c) => (
            <div key={c.label} className="flex items-center gap-2 text-xs text-muted-foreground">
              <span
                className="h-2 w-2 shrink-0 rounded-sm"
                style={{ background: LABEL_COLOR[c.label] }}
              />
              {c.label}
              <b className="ml-auto text-foreground">{c.count}</b>
            </div>
          ))}
          <div className="pt-0.5 text-[11px] text-muted-foreground">
            {total} objectives for {founderProject?.name ?? "this project"}
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-2.5 text-sm font-semibold text-muted-foreground">This week</h2>
        <div className="grid grid-cols-2 gap-2">
          <div
            className="rounded-md p-3"
            style={{ background: "var(--skin-raised, var(--muted))" }}
          >
            <div className="text-xl font-semibold tracking-tight">
              {ECOSYSTEM_METRICS.avgProgressPct}%
            </div>
            <div className="mt-0.5 text-xs text-muted-foreground">Avg. progress</div>
          </div>
          <div
            className="rounded-md p-3"
            style={{ background: "var(--skin-raised, var(--muted))" }}
          >
            <div className="text-xl font-semibold tracking-tight">
              {ECOSYSTEM_METRICS.avgQualityPct}%
            </div>
            <div className="mt-0.5 text-xs text-muted-foreground">Avg. quality</div>
          </div>
          <div
            className="col-span-2 rounded-md p-3"
            style={{ background: "var(--skin-raised, var(--muted))" }}
          >
            <div className="text-xl font-semibold tracking-tight">
              {ECOSYSTEM_METRICS.totalTasksCompleted}
            </div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              Tasks completed across {ECOSYSTEM_METRICS.activeProjects} active projects
            </div>
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-2.5 text-sm font-semibold text-muted-foreground">Worth your attention</h2>
        {risks.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nothing high-priority to flag right now.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {risks.map((task) => {
              const project = getProjectById(task.projectId);
              const style = URGENCY_STYLE[task.urgency];
              return (
                <div
                  key={task.id}
                  className="flex gap-2.5 rounded-md p-2.5"
                  style={{ background: "var(--skin-raised, var(--muted))" }}
                >
                  <AlertTriangle
                    size={15}
                    className="mt-0.5 shrink-0"
                    style={{ color: style.color }}
                  />
                  <p className="text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <b className="text-foreground">{task.title}</b>
                      <span className="font-medium" style={{ color: style.color }}>
                        {style.label}
                      </span>
                    </span>
                    {project?.name} · due {task.dueDate}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-2.5 text-sm font-semibold text-muted-foreground">
          People across your ecosystem
        </h2>
        <div className="flex flex-col">
          {people.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-2.5 py-2.5"
              style={{ borderBottom: "1px solid var(--skin-line-soft, var(--skin-line))" }}
            >
              <Avatar className="h-7 w-7">
                <AvatarFallback
                  className="text-[11px]"
                  style={{
                    background: avatarColor(p.displayName).bg,
                    color: avatarColor(p.displayName).fg,
                  }}
                >
                  {initials(p.displayName)}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="text-sm font-semibold text-foreground">{p.displayName}</div>
                <div className="text-xs text-muted-foreground">{p.title}</div>
              </div>
              <Badge variant="secondary" className="ml-auto capitalize">
                {p.role}
              </Badge>
            </div>
          ))}
        </div>
      </section>
    </aside>
  );
}
