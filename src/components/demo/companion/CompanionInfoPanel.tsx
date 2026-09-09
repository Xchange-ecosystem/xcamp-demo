// src/components/demo/companion/CompanionInfoPanel.tsx
//
// The Companion-altitude right panel's tabbed content — Items / Artifacts &
// Actions / Metrics, matching the reference mockups. Phase 0 found no
// existing component with this exact tab set to reuse (ItemSidepanel's tabs
// are Content/Linked Items/Artifacts & Actions/Match, and it reaches real
// Supabase-backed APIs for non-demo ids — not safe to reuse for an
// unauthenticated demo surface). This panel is fed by the same fixtures
// RightColumn already uses on Platform-level Founder Home
// (src/components/founder/RightColumn.tsx), so its numbers never drift from
// what Founder Home itself shows — but it is a new, purely fixture-driven
// component. No Supabase calls, no writes.
//
// Deliberately not named "*Sidepanel" — this is a different, fixture-only
// component from ItemSidepanel and should stay visually distinct in the
// codebase from it.
import { useState } from "react";
import { AlertTriangle, Zap } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { avatarColor, initials } from "@/lib/avatarColor";
import { ComingSoonTab } from "@/components/task-detail/ComingSoonTab";
import { ECOSYSTEM_METRICS } from "@/fixtures/metrics";
import { getObjectivesByProject, TASKS } from "@/fixtures/objectives";
import { DEMO_FOUNDER_PROJECT_ID } from "@/fixtures/pitch";
import type { Task } from "@/fixtures/types";
import { PEOPLE } from "@/fixtures/people";
import { getProjectById } from "@/fixtures/projects";

type InfoTabKey = "items" | "artifacts-actions" | "metrics";

const INFO_TABS: { key: InfoTabKey; label: string }[] = [
  { key: "items", label: "Items" },
  { key: "artifacts-actions", label: "Artifacts & Actions" },
  { key: "metrics", label: "Metrics" },
];

// Same agreement-lifecycle relabeling RightColumn uses, kept in lockstep so
// the two views never show different labels for the same objective status.
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

export function CompanionInfoPanel() {
  const [activeTab, setActiveTab] = useState<InfoTabKey>("items");

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <div
        style={{
          display: "flex",
          gap: 0,
          borderBottom: "1px solid var(--skin-line)",
          flexShrink: 0,
        }}
      >
        {INFO_TABS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveTab(key)}
            style={{
              padding: "10px 16px",
              fontSize: 13,
              fontWeight: activeTab === key ? 600 : 400,
              color: activeTab === key ? "var(--skin-accent)" : "var(--skin-ink-soft)",
              background: "none",
              border: "none",
              borderBottom:
                activeTab === key ? "2px solid var(--skin-accent)" : "2px solid transparent",
              marginBottom: -1,
              cursor: "pointer",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
        {activeTab === "items" ? (
          <ItemsTabContent />
        ) : activeTab === "metrics" ? (
          <MetricsTabContent />
        ) : (
          <ComingSoonTab icon={Zap} label="Artifacts & Actions" />
        )}
      </div>
    </div>
  );
}

function ItemsTabContent() {
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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <section>
        <h2
          style={{
            marginBottom: 10,
            fontSize: 13,
            fontWeight: 600,
            color: "var(--skin-ink-soft)",
          }}
        >
          Objective progress
        </h2>
        <div
          style={{
            marginBottom: 10,
            display: "flex",
            height: 8,
            gap: 2,
            overflow: "hidden",
            borderRadius: 999,
          }}
        >
          {counts.map((c) => (
            <span key={c.label} style={{ flex: c.count, background: LABEL_COLOR[c.label] }} />
          ))}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {counts.map((c) => (
            <div
              key={c.label}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 12,
                color: "var(--skin-ink-soft)",
              }}
            >
              <span
                style={{
                  height: 8,
                  width: 8,
                  flexShrink: 0,
                  borderRadius: 2,
                  background: LABEL_COLOR[c.label],
                }}
              />
              {c.label}
              <b style={{ marginLeft: "auto", color: "var(--skin-ink)" }}>{c.count}</b>
            </div>
          ))}
          <div style={{ paddingTop: 2, fontSize: 11, color: "var(--skin-ink-faint)" }}>
            {total} objectives for {founderProject?.name ?? "this project"}
          </div>
        </div>
      </section>

      <section>
        <h2
          style={{
            marginBottom: 10,
            fontSize: 13,
            fontWeight: 600,
            color: "var(--skin-ink-soft)",
          }}
        >
          Worth your attention
        </h2>
        {risks.length === 0 ? (
          <p style={{ fontSize: 12, color: "var(--skin-ink-faint)" }}>
            Nothing high-priority to flag right now.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {risks.map((task) => {
              const project = getProjectById(task.projectId);
              const style = URGENCY_STYLE[task.urgency];
              return (
                <div
                  key={task.id}
                  style={{
                    display: "flex",
                    gap: 10,
                    borderRadius: 8,
                    padding: 10,
                    background: "var(--skin-raised, var(--muted))",
                  }}
                >
                  <AlertTriangle
                    size={15}
                    style={{ marginTop: 2, color: style.color, flexShrink: 0 }}
                  />
                  <p style={{ margin: 0, fontSize: 12, color: "var(--skin-ink-soft)" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <b style={{ color: "var(--skin-ink)" }}>{task.title}</b>
                      <span style={{ fontWeight: 600, color: style.color }}>{style.label}</span>
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
        <h2
          style={{
            marginBottom: 10,
            fontSize: 13,
            fontWeight: 600,
            color: "var(--skin-ink-soft)",
          }}
        >
          People across your ecosystem
        </h2>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {PEOPLE.filter((p) => p.role === "investor" || p.role === "collaborator")
            .slice(0, 3)
            .map((p) => (
              <div
                key={p.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 0",
                  borderBottom: "1px solid var(--skin-line-soft, var(--skin-line))",
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
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--skin-ink)" }}>
                    {p.displayName}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--skin-ink-soft)" }}>{p.title}</div>
                </div>
                <Badge variant="secondary" className="ml-auto capitalize">
                  {p.role}
                </Badge>
              </div>
            ))}
        </div>
      </section>
    </div>
  );
}

function MetricsTabContent() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
      <div style={{ borderRadius: 8, padding: 12, background: "var(--skin-raised, var(--muted))" }}>
        <div style={{ fontSize: 20, fontWeight: 600, color: "var(--skin-ink)" }}>
          {ECOSYSTEM_METRICS.avgProgressPct}%
        </div>
        <div style={{ marginTop: 2, fontSize: 12, color: "var(--skin-ink-soft)" }}>
          Avg. progress
        </div>
      </div>
      <div style={{ borderRadius: 8, padding: 12, background: "var(--skin-raised, var(--muted))" }}>
        <div style={{ fontSize: 20, fontWeight: 600, color: "var(--skin-ink)" }}>
          {ECOSYSTEM_METRICS.avgQualityPct}%
        </div>
        <div style={{ marginTop: 2, fontSize: 12, color: "var(--skin-ink-soft)" }}>
          Avg. quality
        </div>
      </div>
      <div
        style={{
          gridColumn: "span 2",
          borderRadius: 8,
          padding: 12,
          background: "var(--skin-raised, var(--muted))",
        }}
      >
        <div style={{ fontSize: 20, fontWeight: 600, color: "var(--skin-ink)" }}>
          {ECOSYSTEM_METRICS.totalTasksCompleted}
        </div>
        <div style={{ marginTop: 2, fontSize: 12, color: "var(--skin-ink-soft)" }}>
          Tasks completed across {ECOSYSTEM_METRICS.activeProjects} active projects
        </div>
      </div>
    </div>
  );
}
