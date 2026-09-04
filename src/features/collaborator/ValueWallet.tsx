// P1.3 Part 2 — value wallet. Distinguishes settled (spendable) / committed
// under agreement (locked) / informational (proposed, not binding) rather
// than showing one total — per the brief, that distinction is the product's
// whole economic model. Settled totals and the recent-activity ledger reuse
// src/fixtures/wallet.ts's existing WALLET_ENTRIES for the demo collaborator
// (Yuki Tanaka, person-9) rather than re-deriving them — her wallet rows
// already match this screen's settled assignments exactly (see
// src/fixtures/assignments.ts).
import { useMemo } from "react";
import { fmt } from "@/components/project-home/MetricPrimitives";
import { getWalletByPerson } from "@/fixtures/wallet";
import type { Assignment } from "@/fixtures/assignments";

// Donut radius/gap match the P1.3 mockup exactly (viewBox 0 0 132 132,
// r=52, stroke-width 15). Arcs are drawn as stroke-dasharray/-dashoffset on
// plain <circle> elements — not a charting library's own redraw — because
// only a CSS transition on those two properties interpolates cleanly when
// the split changes; a library re-render snaps instead.
const RADIUS = 52;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const SEGMENT_GAP = 3;

function usePrefersReducedMotion(): boolean {
  return useMemo(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches, []);
}

const ROWS: {
  key: Assignment["valueState"];
  label: string;
  description: string;
  color: string;
}[] = [
  {
    key: "settled",
    label: "Settled",
    description: "Released to my wallet. Spendable.",
    color: "var(--skin-good)",
  },
  {
    key: "committed",
    label: "Committed under agreement",
    description: "Value is locked. Releases when the objective completes.",
    color: "var(--skin-accent)",
  },
  {
    key: "informational",
    label: "Informational",
    description: "Proposed on sketch work. Not binding on anyone yet.",
    color: "var(--skin-line)",
  },
];

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function ValueWallet({
  assignments,
  collaboratorId,
}: {
  assignments: Assignment[];
  collaboratorId: string;
}) {
  const sums = ROWS.reduce<Record<Assignment["valueState"], number>>(
    (acc, row) => {
      acc[row.key] = assignments
        .filter((a) => a.valueState === row.key)
        .reduce((sum, a) => sum + a.value, 0);
      return acc;
    },
    { settled: 0, committed: 0, informational: 0 },
  );
  const total = sums.settled + sums.committed + sums.informational;
  const projectCount = new Set(assignments.map((a) => a.projectId)).size;
  const prefersReducedMotion = usePrefersReducedMotion();

  let arcOffset = 0;
  const arcs = ROWS.map((row) => {
    const raw = total ? (sums[row.key] / total) * CIRCUMFERENCE : 0;
    const length = raw > SEGMENT_GAP * 2 ? raw - SEGMENT_GAP : raw;
    const arc = { key: row.key, color: row.color, length, offset: arcOffset };
    arcOffset += raw;
    return arc;
  });
  const arcTransition = prefersReducedMotion
    ? "none"
    : "stroke-dasharray .65s cubic-bezier(.22,.8,.2,1), stroke-dashoffset .65s cubic-bezier(.22,.8,.2,1)";

  const ledger = getWalletByPerson(collaboratorId)
    .slice()
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 4);

  return (
    <div className="flex flex-col gap-6">
      <section
        className="rounded-xl border p-4"
        style={{ borderColor: "var(--skin-line)", background: "var(--skin-surface)" }}
      >
        <div className="relative mx-auto h-[132px] w-[132px]">
          <svg
            viewBox="0 0 132 132"
            className="block w-full overflow-visible"
            role="img"
            aria-label="Credits by state"
          >
            <circle
              cx="66"
              cy="66"
              r={RADIUS}
              fill="none"
              stroke="var(--skin-line-soft, var(--skin-line))"
              strokeWidth="15"
            />
            {arcs.map((arc) => (
              <circle
                key={arc.key}
                cx="66"
                cy="66"
                r={RADIUS}
                fill="none"
                stroke={arc.color}
                strokeWidth="15"
                strokeLinecap="butt"
                strokeDasharray={`${arc.length} ${CIRCUMFERENCE - arc.length}`}
                strokeDashoffset={-arc.offset}
                style={{
                  transform: "rotate(-90deg)",
                  transformOrigin: "66px 66px",
                  transition: arcTransition,
                }}
              />
            ))}
          </svg>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
            <b className="text-2xl font-semibold tracking-tight text-foreground">{fmt(total, 0)}</b>
            <span className="text-[11px] text-muted-foreground">credits total</span>
          </div>
        </div>
        <p className="mb-4 mt-1.5 text-center text-xs text-muted-foreground">
          Across {assignments.length} assignment{assignments.length === 1 ? "" : "s"} in{" "}
          {projectCount} project{projectCount === 1 ? "" : "s"}
        </p>

        <div className="flex flex-col gap-2.5">
          {ROWS.map((row) => (
            <div key={row.key} className="flex items-start gap-2.5 text-xs">
              <span
                className="mt-1 h-2 w-2 shrink-0 rounded-sm"
                style={{ background: row.color }}
              />
              <span className="min-w-0 flex-1">
                <b className="block text-[13px] font-semibold text-foreground">{row.label}</b>
                <span className="text-[11.5px] leading-snug text-muted-foreground">
                  {row.description}
                </span>
              </span>
              <span className="shrink-0 text-[13.5px] font-semibold tabular-nums text-foreground">
                {fmt(sums[row.key], 0)}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-2.5 text-sm font-semibold text-muted-foreground">Recent activity</h2>
        {ledger.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nothing settled yet.</p>
        ) : (
          <div className="flex flex-col">
            {ledger.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center gap-2.5 py-2.5 text-sm"
                style={{ borderBottom: "1px solid var(--skin-line-soft, var(--skin-line))" }}
              >
                <span className="min-w-0 flex-1 truncate">
                  {entry.description}
                  <small className="block text-[11.5px] text-muted-foreground">
                    Settled · {formatDate(entry.date)}
                  </small>
                </span>
                <span
                  className="shrink-0 text-sm font-semibold tabular-nums"
                  style={{ color: "var(--skin-good)" }}
                >
                  +{entry.amount}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
