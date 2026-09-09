// Due Diligence (B4 Stage 2) — built against the Objectives redesign spec,
// §9 (viewer/investor journey) and §8.4 (Evaluate stage), quoted in the brief:
//
//   "The panel is a read-only trust card: proof count, evaluation %,
//    four-eyes/external credibility badge, settled value. Expanding does not
//    reveal edit tools — it opens a generated due-diligence Stage: decision
//    timeline, who contributed what, quality trend. The entire lens is
//    provenance."
//
// Read-only is structural here, not a styling choice: there is no control on
// this screen that mutates anything, and expanding swaps in three generated
// panels rather than revealing an editor. Subject is Solari Energy (proj-1),
// the consistent demo project, whose obj-17..22 carry the completed history.
//
// The quality trend is one series over time, so it is a line with no legend
// (the heading names it), one hue, and labels only on the first and last
// points rather than every one.
import { useMemo, useState } from "react";
import { ChevronDown, ShieldCheck } from "lucide-react";
import { ASSIGNMENTS } from "@/fixtures/assignments";
import { OBJECTIVES, TASKS } from "@/fixtures/objectives";
import { getPersonById } from "@/fixtures/people";
import { getProjectById } from "@/fixtures/projects";
import type { Objective } from "@/fixtures/types";

const SUBJECT_PROJECT_ID = "proj-1";

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export function DueDiligenceScreen() {
  const [expanded, setExpanded] = useState(false);
  const project = getProjectById(SUBJECT_PROJECT_ID);

  const objectives = useMemo(
    () => OBJECTIVES.filter((o) => o.projectId === SUBJECT_PROJECT_ID),
    [],
  );
  const completed = useMemo(
    () =>
      objectives
        .filter((o): o is Objective & { completedAt: string } => !!o.completedAt)
        .sort((a, b) => a.completedAt.localeCompare(b.completedAt)),
    [objectives],
  );

  const proofTotal = objectives.reduce((sum, o) => sum + o.proofCount, 0);
  const evaluated = objectives.filter((o) => o.evaluationPct !== null);
  const avgEvaluation = evaluated.length
    ? Math.round(evaluated.reduce((s, o) => s + (o.evaluationPct ?? 0), 0) / evaluated.length)
    : null;
  const fourEyes = completed.filter((o) => o.hasExternalAssessor).length;
  const settledValue = ASSIGNMENTS.filter(
    (a) => a.projectId === SUBJECT_PROJECT_ID && a.valueState === "settled",
  ).reduce((s, a) => s + a.value, 0);

  if (!project) return null;

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
      <h1 className="mb-1.5 text-xl font-semibold tracking-tight text-foreground">Due Diligence</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Everything on this page is provenance: what was filed, who checked it, and what it settled.
        Nothing here can be edited.
      </p>

      <div style={{ maxWidth: 760 }}>
        {/* ── Trust card ── */}
        <section
          style={{
            border: "1px solid var(--skin-line)",
            borderRadius: "var(--xr-lg, 10px)",
            background: "var(--skin-surface)",
            boxShadow: "var(--shadow-card)",
            overflow: "hidden",
          }}
        >
          <div style={{ padding: "16px 18px 4px", display: "flex", alignItems: "center", gap: 9 }}>
            <span
              aria-hidden
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: project.color,
                flexShrink: 0,
              }}
            />
            <h2
              style={{
                margin: 0,
                fontSize: 16,
                fontWeight: 600,
                color: "var(--skin-ink)",
                fontFamily: "var(--skin-font-head)",
              }}
            >
              {project.name}
            </h2>
            <span style={{ fontSize: 12, color: "var(--skin-ink-faint)" }}>Read-only</span>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
              gap: 2,
              padding: "10px 18px 16px",
            }}
          >
            <StatTile label="Proof filed" value={String(proofTotal)} note="rows of evidence" />
            <StatTile
              label="Evaluation"
              value={avgEvaluation === null ? "—" : `${avgEvaluation}%`}
              note={`across ${evaluated.length} assessed`}
            />
            <StatTile
              label="Four-eyes"
              value={`${fourEyes} of ${completed.length}`}
              note="externally signed off"
              badge={fourEyes > 0}
            />
            <StatTile
              label="Settled value"
              value={settledValue.toLocaleString()}
              note="credits released"
            />
          </div>

          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            aria-expanded={expanded}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              padding: "9px 0",
              fontSize: 12.5,
              fontWeight: 500,
              cursor: "pointer",
              border: "none",
              borderTop: "1px solid var(--skin-line-soft)",
              background: "var(--skin-surface2)",
              color: "var(--skin-ink-soft)",
            }}
          >
            {expanded ? "Close due-diligence stage" : "Open due-diligence stage"}
            <ChevronDown
              size={14}
              style={{
                transform: expanded ? "rotate(180deg)" : "none",
                transition: "transform var(--skin-duration, 150ms)",
              }}
            />
          </button>
        </section>

        {expanded && (
          <div style={{ display: "flex", flexDirection: "column", gap: 26, marginTop: 26 }}>
            <DecisionTimeline completed={completed} />
            <ContributionBreakdown />
            <QualityTrend completed={completed} />
          </div>
        )}
      </div>
    </div>
  );
}

// Stat tile: label in sentence case, value in proportional figures (tabular
// figures make a display-size number look loose), optional credibility badge.
function StatTile({
  label,
  value,
  note,
  badge,
}: {
  label: string;
  value: string;
  note: string;
  badge?: boolean;
}) {
  return (
    <div style={{ padding: "6px 0" }}>
      <div style={{ fontSize: 12, color: "var(--skin-ink-soft)", marginBottom: 3 }}>{label}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontSize: 22, fontWeight: 600, color: "var(--skin-ink)", lineHeight: 1.1 }}>
          {value}
        </span>
        {badge && (
          <ShieldCheck
            size={15}
            style={{ color: "var(--skin-good)" }}
            aria-label="External assessor"
          />
        )}
      </div>
      <div style={{ fontSize: 11.5, color: "var(--skin-ink-faint)", marginTop: 2 }}>{note}</div>
    </div>
  );
}

function PanelHeading({ title, sub }: { title: string; sub: string }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "var(--skin-ink)" }}>
        {title}
      </h3>
      <p style={{ margin: "2px 0 0", fontSize: 12.5, color: "var(--skin-ink-faint)" }}>{sub}</p>
    </div>
  );
}

function DecisionTimeline({ completed }: { completed: (Objective & { completedAt: string })[] }) {
  return (
    <section>
      <PanelHeading
        title="Decision timeline"
        sub="Each completion, in the order it happened, with the evidence behind it."
      />
      <ol style={{ listStyle: "none", margin: 0, padding: 0 }}>
        {completed.map((o, i) => (
          <li
            key={o.id}
            style={{
              display: "flex",
              gap: 12,
              paddingBottom: i === completed.length - 1 ? 0 : 14,
              position: "relative",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <span
                aria-hidden
                style={{
                  width: 9,
                  height: 9,
                  borderRadius: "50%",
                  background: "var(--skin-accent)",
                  marginTop: 5,
                  flexShrink: 0,
                }}
              />
              {i !== completed.length - 1 && (
                <span
                  aria-hidden
                  style={{ flex: 1, width: 1, background: "var(--skin-line)", marginTop: 3 }}
                />
              )}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--skin-ink)" }}>
                {o.title}
              </div>
              <div style={{ fontSize: 12, color: "var(--skin-ink-faint)", marginTop: 1 }}>
                {formatDate(o.completedAt)} · {o.dimension}
              </div>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 6,
                  marginTop: 5,
                  fontSize: 11,
                  alignItems: "center",
                }}
              >
                <span style={{ color: "var(--skin-ink-faint)" }}>{o.proofCount} proofs</span>
                {o.evaluationPct !== null && (
                  <span
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
                {o.hasExternalAssessor ? (
                  <span
                    className="inline-flex items-center gap-1"
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
                ) : (
                  <span style={{ color: "var(--skin-ink-faint)" }}>Self-attested</span>
                )}
              </div>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function ContributionBreakdown() {
  const rows = useMemo(() => {
    const tasks = TASKS.filter((t) => t.projectId === SUBJECT_PROJECT_ID && t.assigneeId);
    const byPerson = new Map<string, { done: number; total: number; objectives: Set<string> }>();
    for (const t of tasks) {
      const entry = byPerson.get(t.assigneeId!) ?? { done: 0, total: 0, objectives: new Set() };
      entry.total += 1;
      if (t.done) entry.done += 1;
      entry.objectives.add(t.objectiveId);
      byPerson.set(t.assigneeId!, entry);
    }
    return [...byPerson.entries()]
      .map(([personId, v]) => ({ personId, ...v, objectiveCount: v.objectives.size }))
      .sort((a, b) => b.done - a.done || b.total - a.total);
  }, []);

  const max = Math.max(1, ...rows.map((r) => r.total));

  return (
    <section>
      <PanelHeading
        title="Who contributed what"
        sub="Named contributors on this project, by work completed against its objectives."
      />
      <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
        {rows.map((row) => {
          const person = getPersonById(row.personId);
          return (
            <div key={row.personId} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span
                style={{
                  width: 132,
                  flexShrink: 0,
                  fontSize: 13,
                  color: "var(--skin-ink)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {person?.displayName ?? row.personId}
              </span>
              {/* Magnitude comparison, so one hue rather than a colour per person. */}
              <span
                style={{
                  flex: 1,
                  height: 8,
                  borderRadius: 999,
                  background: "var(--skin-line-soft)",
                  overflow: "hidden",
                  minWidth: 40,
                }}
              >
                <span
                  style={{
                    display: "block",
                    height: "100%",
                    width: `${(row.total / max) * 100}%`,
                    borderRadius: 999,
                    background: "var(--skin-accent)",
                  }}
                />
              </span>
              <span
                className="tabular-nums"
                style={{
                  width: 150,
                  flexShrink: 0,
                  textAlign: "right",
                  fontSize: 11.5,
                  color: "var(--skin-ink-faint)",
                }}
              >
                {row.done}/{row.total} done · {row.objectiveCount} objective
                {row.objectiveCount === 1 ? "" : "s"}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// One series over time: line, one hue, no legend (the heading names it),
// direct labels on the first and last points only.
function QualityTrend({ completed }: { completed: (Objective & { completedAt: string })[] }) {
  const points = completed.filter((o) => o.evaluationPct !== null);

  if (points.length < 2) {
    return (
      <section>
        <PanelHeading title="Quality trend" sub="Assessor scores over time." />
        <p style={{ fontSize: 12.5, color: "var(--skin-ink-faint)", margin: 0 }}>
          Not enough assessed completions yet to show a trend.
        </p>
      </section>
    );
  }

  const W = 560;
  const H = 132;
  const PAD = { top: 18, right: 34, bottom: 24, left: 34 };
  const lo = 70;
  const hi = 100;
  const x = (i: number) =>
    PAD.left + (i * (W - PAD.left - PAD.right)) / Math.max(1, points.length - 1);
  const y = (v: number) => PAD.top + (1 - (v - lo) / (hi - lo)) * (H - PAD.top - PAD.bottom);

  const path = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(p.evaluationPct!).toFixed(1)}`)
    .join(" ");

  return (
    <section>
      <PanelHeading
        title="Quality trend"
        sub="Assessor score on each completed objective, oldest first."
      />
      <div style={{ overflowX: "auto" }}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          width="100%"
          style={{ display: "block", minWidth: 420, maxWidth: W }}
          role="img"
          aria-label={`Assessor scores over time, from ${points[0].evaluationPct}% to ${points[points.length - 1].evaluationPct}%`}
        >
          {/* Recessive reference lines at the band edges. */}
          {[lo, hi].map((v) => (
            <line
              key={v}
              x1={PAD.left}
              x2={W - PAD.right}
              y1={y(v)}
              y2={y(v)}
              stroke="var(--skin-line)"
              strokeWidth="1"
            />
          ))}
          <path d={path} fill="none" stroke="var(--skin-accent)" strokeWidth="2" />
          {points.map((p, i) => {
            const isEnd = i === 0 || i === points.length - 1;
            return (
              <g key={p.id}>
                <circle
                  cx={x(i)}
                  cy={y(p.evaluationPct!)}
                  r="4"
                  fill="var(--skin-accent)"
                  stroke="var(--skin-surface)"
                  strokeWidth="2"
                />
                {isEnd && (
                  <text
                    x={x(i)}
                    y={y(p.evaluationPct!) - 10}
                    textAnchor="middle"
                    style={{ fontSize: 11, fontWeight: 600, fill: "var(--skin-ink)" }}
                  >
                    {p.evaluationPct}%
                  </text>
                )}
              </g>
            );
          })}
          {/* Axis: first and last dates only — a tick per point would collide. */}
          <text
            x={PAD.left}
            y={H - 6}
            textAnchor="start"
            style={{ fontSize: 10.5, fill: "var(--skin-ink-faint)" }}
          >
            {formatDate(points[0].completedAt)}
          </text>
          <text
            x={W - PAD.right}
            y={H - 6}
            textAnchor="end"
            style={{ fontSize: 10.5, fill: "var(--skin-ink-faint)" }}
          >
            {formatDate(points[points.length - 1].completedAt)}
          </text>
        </svg>
      </div>
      {/* The chart is one channel; the same numbers stay readable as text. */}
      <p style={{ fontSize: 11.5, color: "var(--skin-ink-faint)", margin: "6px 0 0" }}>
        {points.map((p) => `${p.evaluationPct}%`).join(" · ")}
      </p>
    </section>
  );
}
