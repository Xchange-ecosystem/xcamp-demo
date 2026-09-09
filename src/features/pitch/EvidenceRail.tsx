import { forwardRef } from "react";
import type { PitchSource } from "@/fixtures/pitch";
import { getObjectiveById } from "@/fixtures/objectives";

function formatCompletedDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function sourceMeta(source: PitchSource): { title: string; meta: string; proofLabel: string } {
  const objective = getObjectiveById(source.objectiveId);
  if (!objective) {
    // Fixture integrity issue (a pitch card references an objective id that
    // no longer exists) — degrade instead of crashing, same pattern as
    // assignments.ts's getAssignmentObjectiveTitle.
    return { title: source.objectiveId, meta: "", proofLabel: "" };
  }
  const statusLabel =
    objective.status === "done"
      ? `completed ${formatCompletedDate(objective.completedAt!)}`
      : objective.status === "in_progress"
        ? "in progress"
        : "open";
  return {
    title: objective.title,
    meta: `${objective.dimension} · ${statusLabel}`,
    proofLabel: `${objective.proofCount} ${objective.proofCount === 1 ? "proof" : "proofs"}`,
  };
}

export const EvidenceRow = forwardRef<
  HTMLDivElement,
  { source: PitchSource; index: number; lit: boolean }
>(function EvidenceRow({ source, index, lit }, ref) {
  const { title, meta, proofLabel } = sourceMeta(source);

  return (
    <div
      ref={ref}
      data-source-index={index}
      className="grid grid-cols-[22px_1fr] items-start gap-x-3.5 gap-y-1 rounded-lg py-3 transition-colors sm:grid-cols-[24px_1fr_auto] sm:gap-y-0"
      style={{
        background: lit ? "var(--skin-accent-soft)" : "transparent",
        borderTop: index === 1 ? "none" : "1px solid var(--skin-line)",
      }}
    >
      <span
        className="mt-0.5 flex h-[22px] items-center justify-center rounded-md text-xs font-semibold"
        style={{ background: "var(--skin-accent-soft)", color: "var(--skin-accent)" }}
      >
        {index}
      </span>
      <div className="min-w-0">
        <p className="text-sm font-medium" style={{ color: "var(--skin-ink)" }}>
          {title}
        </p>
        <p className="mt-0.5 text-xs" style={{ color: "var(--skin-ink-faint)" }}>
          {meta}
        </p>
      </div>
      <span
        className="col-start-2 flex items-center gap-1.5 whitespace-nowrap text-xs sm:col-start-3"
        style={{ color: "var(--skin-ink-soft)" }}
      >
        <span
          aria-hidden
          className="h-[5px] w-[5px] shrink-0 rounded-full"
          style={{ background: source.warm ? "var(--skin-warn)" : "var(--skin-accent)" }}
        />
        {proofLabel}
      </span>
    </div>
  );
});

export function EvidenceRail({
  sources,
  litIndex,
  rowRefs,
}: {
  sources: PitchSource[];
  litIndex: number | null;
  rowRefs: React.MutableRefObject<Record<number, HTMLDivElement | null>>;
}) {
  const totalProofs = sources.reduce((sum, s) => {
    const objective = getObjectiveById(s.objectiveId);
    return sum + (objective?.proofCount ?? 0);
  }, 0);

  return (
    <div
      className="px-6 py-5 sm:px-7"
      style={{ borderTop: "1px solid var(--skin-line)", background: "var(--skin-surface2)" }}
    >
      <h3 className="text-sm font-semibold" style={{ color: "var(--skin-ink)" }}>
        Where this came from
      </h3>
      <p className="mb-3.5 mt-0.5 text-sm" style={{ color: "var(--skin-ink-soft)" }}>
        {sources.length} {sources.length === 1 ? "Objective" : "Objectives"}, {totalProofs} filed
        proofs.
      </p>
      {sources.map((source, i) => {
        const index = i + 1;
        return (
          <EvidenceRow
            key={source.objectiveId}
            source={source}
            index={index}
            lit={litIndex === index}
            ref={(el) => {
              rowRefs.current[index] = el;
            }}
          />
        );
      })}
    </div>
  );
}
