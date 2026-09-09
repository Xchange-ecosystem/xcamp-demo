import type { Project } from "@/fixtures/types";
import type { PitchCardState } from "@/fixtures/pitch";

// Segment color for the "cards composed" meter.
const SEGMENT_COLOR: Record<PitchCardState, string> = {
  fresh: "var(--skin-accent)",
  stale: "var(--skin-warn)",
  empty: "var(--skin-line)",
};

export function PitchMasthead({
  project,
  cardStates,
}: {
  project: Project;
  cardStates: PitchCardState[];
}) {
  const composedCount = cardStates.filter((s) => s !== "empty").length;

  return (
    <div
      className="flex flex-wrap items-end justify-between gap-6 pb-4"
      style={{ borderBottom: "1px solid var(--skin-line)" }}
    >
      <div>
        <div
          className="mb-2 flex items-center gap-2 text-sm"
          style={{ color: "var(--skin-ink-faint)" }}
        >
          <span
            aria-hidden
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ background: project.color }}
          />
          <span className="font-medium" style={{ color: "var(--skin-ink-soft)" }}>
            {project.name}
          </span>
          <span>Pitch</span>
        </div>
        <h1
          className="text-2xl font-semibold leading-tight tracking-tight"
          style={{ color: "var(--skin-ink)", fontFamily: "var(--skin-font-head)" }}
        >
          Your pitch, drawn from your evidence
        </h1>
        <p className="mt-2 max-w-md text-sm" style={{ color: "var(--skin-ink-soft)" }}>
          Nothing here is written from scratch. Each card is composed from the Objectives you've
          completed and the proof filed against them.
        </p>
      </div>

      <div className="min-w-[13rem]">
        <div
          className="flex items-baseline justify-between text-sm"
          style={{ color: "var(--skin-ink-soft)" }}
        >
          <span>Cards composed</span>
          <strong
            className="text-xl font-semibold tracking-tight"
            style={{ color: "var(--skin-ink)" }}
          >
            {composedCount}/{cardStates.length}
          </strong>
        </div>
        <div className="mt-2 flex gap-1" aria-hidden>
          {cardStates.map((state, i) => (
            <i
              key={i}
              className="h-1.5 flex-1 rounded-full"
              style={{ background: SEGMENT_COLOR[state] }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
