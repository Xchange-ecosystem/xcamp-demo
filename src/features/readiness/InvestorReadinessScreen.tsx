// Readiness, investor variant (B4 Stage 3) — first implementation. Phase 0
// confirmed the Founder Readiness route is a placeholder with nothing behind
// it, so there was no build to extend; this does not fork one.
//
// The investor framing is the whole difference from what a Founder version
// would be. A founder's Readiness answers "what should I fix next"; this one
// answers "what would stall a term sheet" — the same underlying evidence, read
// as risk rather than as a task list. Nothing here is a score out of ten: every
// state below is derived from the fixture data and says which evidence is
// missing, because a number an investor cannot interrogate is worth nothing to
// them.
//
// Dimensions are the real Objective.dimension values, so a gap here maps to a
// specific part of the business rather than to an invented rubric.
import { useMemo, useState } from "react";
import { OBJECTIVES } from "@/fixtures/objectives";
import { PROJECTS } from "@/fixtures/projects";
import type { Objective, ObjectiveDimension } from "@/fixtures/types";

const DIMENSIONS: ObjectiveDimension[] = ["Market", "Product", "Operations", "Business", "Team"];

type ReadinessState = "strong" | "adequate" | "thin" | "absent";

const STATE_LABEL: Record<ReadinessState, string> = {
  strong: "Strong",
  adequate: "Adequate",
  thin: "Thin",
  absent: "No evidence",
};

// Deliberately simple and stated in the UI, so a viewer can check the call
// rather than trust it: evidence is strong when something in the dimension is
// finished AND externally assessed, adequate when finished but self-attested,
// thin when work exists but nothing has completed, absent when the dimension
// has no objectives at all.
function assess(objectives: Objective[]): ReadinessState {
  if (objectives.length === 0) return "absent";
  const done = objectives.filter((o) => o.status === "done");
  if (done.length === 0) return "thin";
  return done.some((o) => o.hasExternalAssessor) ? "strong" : "adequate";
}

function stateColor(state: ReadinessState): string {
  switch (state) {
    case "strong":
      return "var(--skin-good)";
    case "adequate":
      return "var(--skin-accent)";
    case "thin":
      return "var(--skin-ink-faint)";
    case "absent":
      return "var(--skin-bad)";
  }
}

export function InvestorReadinessScreen() {
  const [selectedId, setSelectedId] = useState("proj-1");
  const selected = PROJECTS.find((p) => p.id === selectedId);

  const rows = useMemo(() => {
    const projectObjectives = OBJECTIVES.filter((o) => o.projectId === selectedId);
    return DIMENSIONS.map((dimension) => {
      const objectives = projectObjectives.filter((o) => o.dimension === dimension);
      const done = objectives.filter((o) => o.status === "done");
      const proofs = objectives.reduce((s, o) => s + o.proofCount, 0);
      const assessed = objectives.filter((o) => o.evaluationPct !== null);
      const avgEvaluation = assessed.length
        ? Math.round(assessed.reduce((s, o) => s + (o.evaluationPct ?? 0), 0) / assessed.length)
        : null;
      return {
        dimension,
        state: assess(objectives),
        total: objectives.length,
        done: done.length,
        proofs,
        avgEvaluation,
        fourEyes: done.filter((o) => o.hasExternalAssessor).length,
      };
    });
  }, [selectedId]);

  // The gap list is the deliverable — the states above are just how it is
  // derived. Ordered worst-first, because that is the reading order.
  const gaps = useMemo(
    () =>
      rows
        .filter((r) => r.state === "absent" || r.state === "thin" || r.state === "adequate")
        .sort((a, b) => {
          const order: ReadinessState[] = ["absent", "thin", "adequate", "strong"];
          return order.indexOf(a.state) - order.indexOf(b.state);
        })
        .map((r) => {
          if (r.state === "absent") {
            return {
              dimension: r.dimension,
              text: `No objectives filed under ${r.dimension} at all — nothing to diligence.`,
            };
          }
          if (r.state === "thin") {
            return {
              dimension: r.dimension,
              text: `${r.total} objective${r.total === 1 ? "" : "s"} open under ${r.dimension}, none completed. ${r.proofs} proof${r.proofs === 1 ? "" : "s"} filed so far.`,
            };
          }
          return {
            dimension: r.dimension,
            text: `${r.dimension} completions are self-attested — no external assessor has signed any of them off.`,
          };
        }),
    [rows],
  );

  if (!selected) return null;

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
      <h1 className="mb-1.5 text-xl font-semibold tracking-tight text-foreground">Readiness</h1>
      <p className="mb-5 text-sm text-muted-foreground">
        How much of this project is backed by evidence you could act on, broken down by the part of
        the business it moves.
      </p>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 22 }}>
        {PROJECTS.map((project) => {
          const active = project.id === selectedId;
          return (
            <button
              key={project.id}
              type="button"
              aria-pressed={active}
              onClick={() => setSelectedId(project.id)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                padding: "5px 11px",
                fontSize: 12.5,
                borderRadius: "var(--xr-pill, 999px)",
                border: `1px solid ${active ? "var(--skin-accent)" : "var(--skin-line)"}`,
                background: active ? "var(--skin-accent-soft)" : "var(--skin-surface)",
                color: "var(--skin-ink)",
                cursor: "pointer",
              }}
            >
              <span
                aria-hidden
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: project.color,
                  flexShrink: 0,
                }}
              />
              {project.name}
            </button>
          );
        })}
      </div>

      <div style={{ maxWidth: 780 }}>
        <h2
          style={{
            margin: "0 0 3px",
            fontSize: 14,
            fontWeight: 600,
            color: "var(--skin-ink)",
          }}
        >
          Evidence by dimension
        </h2>
        <p style={{ margin: "0 0 10px", fontSize: 12.5, color: "var(--skin-ink-faint)" }}>
          Strong means a completed objective an external assessor signed off. Adequate means
          completed but self-attested.
        </p>

        <div
          style={{
            border: "1px solid var(--skin-line)",
            borderRadius: "var(--xr-lg, 10px)",
            overflow: "hidden",
            background: "var(--skin-surface)",
          }}
        >
          {rows.map((row, i) => (
            <div
              key={row.dimension}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 13px",
                borderTop: i === 0 ? "none" : "1px solid var(--skin-line-soft)",
              }}
            >
              <span
                aria-hidden
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: stateColor(row.state),
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  width: 96,
                  flexShrink: 0,
                  fontSize: 13.5,
                  fontWeight: 600,
                  color: "var(--skin-ink)",
                }}
              >
                {row.dimension}
              </span>
              <span
                style={{
                  width: 92,
                  flexShrink: 0,
                  fontSize: 12,
                  color: stateColor(row.state),
                  fontWeight: 500,
                }}
              >
                {STATE_LABEL[row.state]}
              </span>
              <span
                className="tabular-nums"
                style={{ flex: 1, fontSize: 11.5, color: "var(--skin-ink-faint)" }}
              >
                {row.done}/{row.total} complete · {row.proofs} proofs
                {row.avgEvaluation !== null && ` · ${row.avgEvaluation}% avg`}
                {row.fourEyes > 0 && ` · ${row.fourEyes} four-eyes`}
              </span>
            </div>
          ))}
        </div>

        <h2
          style={{
            margin: "26px 0 3px",
            fontSize: 14,
            fontWeight: 600,
            color: "var(--skin-ink)",
          }}
        >
          What would stall a term sheet
        </h2>
        <p style={{ margin: "0 0 10px", fontSize: 12.5, color: "var(--skin-ink-faint)" }}>
          Derived from the table above, worst first.
        </p>

        {gaps.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--skin-ink-soft)", margin: 0 }}>
            Every dimension has an externally assessed completion. Nothing here is blocking.
          </p>
        ) : (
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {gaps.map((gap) => (
              <li
                key={gap.dimension}
                style={{
                  display: "flex",
                  gap: 9,
                  padding: "7px 0",
                  fontSize: 13,
                  color: "var(--skin-ink-soft)",
                  lineHeight: 1.5,
                }}
              >
                <span
                  style={{
                    flexShrink: 0,
                    fontWeight: 600,
                    color: "var(--skin-ink)",
                    width: 84,
                  }}
                >
                  {gap.dimension}
                </span>
                <span>{gap.text}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
