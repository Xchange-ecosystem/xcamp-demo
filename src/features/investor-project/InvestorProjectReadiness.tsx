// src/features/investor-project/InvestorProjectReadiness.tsx
//
// Investor-facing Readiness view — read-only rendering of the same
// underlying data as ReadinessMicroApp.tsx (Founder), per the "Readiness:
// Investor View" session brief. Placement: a new tab under the Investor
// Project View drill-down, not a "Due Diligence" section — Phase 0 found no
// Due Diligence tool anywhere in this repo, scoped or placeholder, so there
// was nothing to extend.
//
// Left rail + score formula are byte-for-byte the same computation as
// Founder's (statusOf/avgConfidence, copied rather than imported since
// ReadinessMicroApp doesn't export them — "invariant truth, same for every
// role"). What's dropped: the whole right-rail Copilot column (pending
// suggestions are default-omitted per the brief — showing an external
// viewer unconfirmed AI matches cuts against the documentation-as-proof
// positioning) and every Accept/Reject affordance. Reads
// useReadinessMatchingStore directly — it's a plain Zustand store, already
// reachable from any component, no wiring change needed for read access.
import { useState } from "react";
import { ClipboardCheck } from "lucide-react";
import { ComingSoonPage } from "@/components/ComingSoonPage";
import {
  READINESS_CRITERIA,
  READINESS_TEMPLATE_NAME,
  type MatchSourceType,
  type ReadinessMatch,
} from "@/fixtures/readinessMatching";
import { useReadinessMatchingStore } from "@/store/readinessMatchingStore";
import { getProjectById } from "@/fixtures/projects";
import { DEMO_FOUNDER_PROJECT_ID } from "@/fixtures/pitch";

type CriterionStatus = "covered" | "partial" | "uncovered";

const STATUS_COLOR: Record<CriterionStatus, string> = {
  covered: "var(--skin-good)",
  partial: "var(--skin-warn)",
  uncovered: "var(--skin-ink-faint)",
};

const SOURCE_TYPE_LABEL: Record<MatchSourceType, string> = {
  objective: "Objective",
  task: "Task",
  dimension: "Dimension",
  tag: "Tag",
};

// Same formula as ReadinessMicroApp.tsx's avgConfidence/statusOf — kept in
// sync by hand since neither is exported from that file. Any change to the
// Founder screen's scoring must be mirrored here, or the two roles'
// "invariant truth" stops being invariant.
function avgConfidence(matches: ReadinessMatch[]): number {
  if (matches.length === 0) return 0;
  return matches.reduce((sum, m) => sum + m.confidence, 0) / matches.length;
}

function statusOf(confirmed: ReadinessMatch[], hasPending: boolean): CriterionStatus {
  if (confirmed.length === 0) return "uncovered";
  if (avgConfidence(confirmed) >= 70 && !hasPending) return "covered";
  return "partial";
}

const RADIUS = 26;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function ScoreRing({ score }: { score: number }) {
  const offset = CIRCUMFERENCE * (1 - score / 100);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <svg width={60} height={60} viewBox="0 0 60 60" role="img" aria-label={`${score}% ready`}>
        <circle cx={30} cy={30} r={RADIUS} fill="none" stroke="var(--skin-line)" strokeWidth={5} />
        <circle
          cx={30}
          cy={30}
          r={RADIUS}
          fill="none"
          stroke="var(--skin-accent)"
          strokeWidth={5}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
          transform="rotate(-90 30 30)"
        />
      </svg>
      <div>
        <div style={{ fontSize: 22, fontWeight: 600, lineHeight: 1, color: "var(--skin-ink)" }}>
          {score}%
        </div>
        <div style={{ fontSize: 11.5, color: "var(--skin-ink-soft)", marginTop: 2 }}>ready</div>
      </div>
    </div>
  );
}

function ReadinessReadOnly({ projectId }: { projectId: string }) {
  const project = getProjectById(projectId);
  // Pending suggestions still factor into status computation (the
  // covered/partial/uncovered glyph is invariant truth, same for every
  // role) but are never rendered here — no right rail, no counts mentioning
  // them, per the brief's default-omit rule.
  const { confirmedByCriterion, pendingSuggestions } = useReadinessMatchingStore();
  const [activeId, setActiveId] = useState(READINESS_CRITERIA[0].id);

  const overallScore = Math.round(
    READINESS_CRITERIA.reduce(
      (sum, c) => sum + avgConfidence(confirmedByCriterion[c.id] ?? []),
      0,
    ) / READINESS_CRITERIA.length,
  );

  const activeCriterion = READINESS_CRITERIA.find((c) => c.id === activeId)!;
  const activeConfirmed = confirmedByCriterion[activeId] ?? [];

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            Readiness — {project?.name ?? "this project"}
          </h1>
          <p className="text-sm text-muted-foreground">
            Matched against: {READINESS_TEMPLATE_NAME}
          </p>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            background: "var(--skin-surface)",
            border: "1px solid var(--skin-line)",
            borderRadius: "var(--skin-radius-lg, 22px)",
            padding: "10px 18px",
          }}
        >
          <ScoreRing score={overallScore} />
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "230px 1fr",
          gap: 16,
          alignItems: "start",
        }}
        className="max-lg:grid-cols-1"
      >
        {/* Left rail — spine */}
        <div
          style={{
            background: "var(--skin-surface)",
            border: "1px solid var(--skin-line)",
            borderRadius: "var(--skin-radius, 14px)",
            padding: "14px 12px",
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 500,
              color: "var(--skin-ink-faint)",
              marginBottom: 10,
              paddingLeft: 4,
            }}
          >
            Criteria
          </div>
          {READINESS_CRITERIA.map((c) => {
            const confirmed = confirmedByCriterion[c.id] ?? [];
            const hasPending = pendingSuggestions.some((s) => s.criterionId === c.id);
            const status = statusOf(confirmed, hasPending);
            const metaText = confirmed.length === 0 ? "no matches" : `${confirmed.length} matched`;
            const active = c.id === activeId;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setActiveId(c.id)}
                style={{
                  display: "flex",
                  width: "100%",
                  alignItems: "flex-start",
                  gap: 9,
                  padding: "10px 8px",
                  borderRadius: 6,
                  border: "none",
                  textAlign: "left",
                  cursor: "pointer",
                  marginBottom: 2,
                  background: active ? "var(--skin-accent-soft)" : "transparent",
                }}
              >
                <span
                  style={{
                    width: 9,
                    height: 9,
                    borderRadius: "50%",
                    marginTop: 4,
                    flexShrink: 0,
                    background: status === "uncovered" ? "transparent" : STATUS_COLOR[status],
                    border:
                      status === "uncovered" ? `1.5px dashed ${STATUS_COLOR.uncovered}` : "none",
                  }}
                />
                <span>
                  <div style={{ fontSize: 13, fontWeight: 500, color: "var(--skin-ink)" }}>
                    {c.name}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--skin-ink-soft)", marginTop: 2 }}>
                    {metaText}
                  </div>
                </span>
              </button>
            );
          })}
        </div>

        {/* Center stage */}
        <div
          style={{
            background: "var(--skin-surface)",
            border: "1px solid var(--skin-line)",
            borderRadius: "var(--skin-radius, 14px)",
            padding: "14px 16px",
          }}
        >
          <h2
            style={{ fontSize: 17, fontWeight: 500, margin: "0 0 4px", color: "var(--skin-ink)" }}
          >
            {activeCriterion.name}
          </h2>
          <p style={{ fontSize: 13, color: "var(--skin-ink-soft)", margin: "0 0 16px" }}>
            Confirmed project evidence for this criterion, weighted by confidence.
          </p>

          {activeConfirmed.length === 0 ? (
            <div
              style={{
                border: "1px dashed var(--skin-line)",
                borderRadius: 8,
                padding: "18px 16px",
                fontSize: 13,
                lineHeight: 1.5,
                background: "var(--skin-warn-soft)",
                color: "var(--skin-warn)",
              }}
            >
              No confirmed matches yet. This is a coverage gap, not a low score.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {activeConfirmed.map((m) => (
                <div
                  key={m.id}
                  style={{
                    border: "1px solid var(--skin-line)",
                    borderRadius: 8,
                    padding: "12px 14px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 6,
                    }}
                  >
                    <span style={{ fontSize: 13.5, fontWeight: 500, color: "var(--skin-ink)" }}>
                      {m.title}
                    </span>
                    <span style={{ fontSize: 11, color: "var(--skin-ink-faint)" }}>
                      {SOURCE_TYPE_LABEL[m.sourceType]}
                    </span>
                  </div>
                  <div
                    style={{
                      height: 5,
                      borderRadius: 3,
                      background: "var(--skin-line-soft, var(--skin-line))",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${m.confidence}%`,
                        background: "var(--skin-accent)",
                        borderRadius: 3,
                      }}
                    />
                  </div>
                  <div style={{ fontSize: 11, color: "var(--skin-ink-soft)", marginTop: 5 }}>
                    {m.confidence}% match confidence
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <p
        style={{
          fontSize: 11.5,
          color: "var(--skin-ink-faint)",
          marginTop: 18,
          lineHeight: 1.6,
          maxWidth: 640,
        }}
      >
        Confidence shown per matched item, not per criterion. A criterion with zero matches is a
        coverage gap — a missing signal, not a low score.
      </p>
    </div>
  );
}

export function InvestorProjectReadiness({ projectId }: { projectId: string }) {
  if (projectId !== DEMO_FOUNDER_PROJECT_ID) {
    return (
      <ComingSoonPage
        icon={ClipboardCheck}
        title="Readiness"
        subtitle="This project hasn't been assessed against a readiness template yet — Solari Energy is the only one in this demo."
      />
    );
  }
  return <ReadinessReadOnly projectId={projectId} />;
}
