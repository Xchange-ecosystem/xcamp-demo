import { AlertTriangle } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { avatarColor, initials } from "@/lib/avatarColor";
import { getPersonById, getProjectById, getProjectMetrics, getTasksByProject } from "@/fixtures";
import type { Task } from "@/fixtures";

// Investor-flavored variant of Founder Dashboard (session brief §4) —
// same KPI-tile + "worth your attention" + team shape as Founder's
// RightColumn, parametrized to whichever project the investor drilled
// into instead of RightColumn's hardcoded DEMO_FOUNDER_PROJECT_ID /
// ecosystem-wide scope, since an investor can drill into any of the
// portfolio's projects, not just Solari Energy.
const DEMO_TODAY = "2026-09-04";
const DEMO_WEEK_END = "2026-09-11";

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

function KpiTile({ value, label }: { value: string | number; label: string }) {
  return (
    <div
      style={{
        padding: "14px 16px",
        borderRadius: "var(--xr-lg, 10px)",
        border: "1px solid var(--skin-line)",
        background: "var(--skin-surface)",
      }}
    >
      <div style={{ fontSize: 22, fontWeight: 700, color: "var(--skin-ink)" }}>{value}</div>
      <div style={{ fontSize: 12, color: "var(--skin-ink-soft)", marginTop: 2 }}>{label}</div>
    </div>
  );
}

export function InvestorProjectDashboard({ projectId }: { projectId: string }) {
  const project = getProjectById(projectId);
  const metrics = getProjectMetrics(projectId);
  const tasks = getTasksByProject(projectId);

  if (!project) return null;

  const risks: (Task & { urgency: Urgency })[] = tasks
    .filter((t) => t.status === "active" && t.priority === "high" && t.dueDate)
    .map((t) => ({ ...t, urgency: urgencyOf(t.dueDate!) }))
    .sort(
      (a, b) =>
        URGENCY_ORDER[a.urgency] - URGENCY_ORDER[b.urgency] || a.dueDate!.localeCompare(b.dueDate!),
    )
    .slice(0, 4);

  const teamIds = new Set<string>([project.ownerId]);
  for (const task of tasks) {
    if (task.assigneeId) teamIds.add(task.assigneeId);
  }
  const team = [...teamIds]
    .map((id) => getPersonById(id))
    .filter((p): p is NonNullable<typeof p> => !!p);

  return (
    <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "28px 32px 48px" }}>
      <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "var(--skin-ink)" }}>
        {project.name} — Dashboard
      </h1>
      <p style={{ margin: "4px 0 24px", fontSize: 14, color: "var(--skin-ink-soft)" }}>
        Where this project stands, in the terms an investor asks about.
      </p>

      {metrics ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: 12,
            marginBottom: 28,
          }}
        >
          <KpiTile value={`${metrics.progressPct}%`} label="Progress" />
          <KpiTile value={`${metrics.qualityPct}%`} label="Quality score" />
          <KpiTile value={metrics.proofTotal} label="Proof filed" />
          <KpiTile value={metrics.collaboratorsCount} label="Collaborators" />
          <KpiTile value={metrics.viewersCount} label="Viewers" />
        </div>
      ) : (
        <div
          style={{
            padding: "20px 16px",
            marginBottom: 28,
            textAlign: "center",
            color: "var(--skin-ink-faint)",
            fontSize: 13,
            border: "1px dashed var(--skin-line)",
            borderRadius: "var(--xr-lg, 10px)",
          }}
        >
          No metrics recorded for this project yet.
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) 280px",
          gap: 28,
        }}
      >
        <section>
          <h2
            style={{
              margin: "0 0 12px",
              fontSize: 15,
              fontWeight: 600,
              color: "var(--skin-ink)",
            }}
          >
            Worth your attention
          </h2>
          {risks.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--skin-ink-faint)" }}>
              Nothing high-priority to flag right now.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {risks.map((task) => {
                const style = URGENCY_STYLE[task.urgency];
                return (
                  <div
                    key={task.id}
                    style={{
                      display: "flex",
                      gap: 10,
                      padding: 12,
                      borderRadius: "var(--xr, 8px)",
                      border: "1px solid var(--skin-line)",
                      background: "var(--skin-surface)",
                    }}
                  >
                    <AlertTriangle
                      size={15}
                      style={{ color: style.color, flexShrink: 0, marginTop: 2 }}
                    />
                    <div style={{ fontSize: 13, color: "var(--skin-ink-soft)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <b style={{ color: "var(--skin-ink)" }}>{task.title}</b>
                        <span style={{ color: style.color, fontWeight: 600, fontSize: 12 }}>
                          {style.label}
                        </span>
                      </div>
                      due {task.dueDate}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <aside>
          <h2
            style={{
              margin: "0 0 12px",
              fontSize: 15,
              fontWeight: 600,
              color: "var(--skin-ink)",
            }}
          >
            Team
          </h2>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {team.map((p) => (
              <div
                key={p.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 0",
                  borderBottom: "1px solid var(--skin-line-soft)",
                }}
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
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--skin-ink)" }}>
                    {p.displayName}
                  </div>
                  <div
                    style={{
                      fontSize: 11.5,
                      color: "var(--skin-ink-faint)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {p.title}
                  </div>
                </div>
                {p.id === project.ownerId && (
                  <Badge variant="secondary" className="ml-auto">
                    Owner
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
