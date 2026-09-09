import { useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { CheckCircle2, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { cn } from "@/lib/utils";
import type { PitchCard } from "@/fixtures/pitch";
import { EvidenceRail } from "./EvidenceRail";

export function PitchStage({
  card,
  isComposing,
  onRecompose,
}: {
  card: PitchCard;
  isComposing: boolean;
  onRecompose: (id: string) => void;
}) {
  const [litIndex, setLitIndex] = useState<number | null>(null);
  const rowRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const prefersReducedMotion = usePrefersReducedMotion();

  if (card.state === "empty") {
    return <EmptyStage card={card} />;
  }

  const stale = card.state === "stale";

  const handleCiteClick = (index: number) => {
    rowRefs.current[index]?.scrollIntoView({
      behavior: prefersReducedMotion ? "auto" : "smooth",
      block: "center",
    });
  };

  return (
    <div
      className="flex min-h-0 flex-1 flex-col overflow-y-auto rounded-[var(--xr-lg)]"
      style={{ border: "1px solid var(--skin-line)", background: "var(--skin-surface)" }}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 px-6 pt-5 sm:px-7">
        <h2 className="text-sm font-semibold" style={{ color: "var(--skin-ink)" }}>
          {card.name}
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => onRecompose(card.id)}>
            {stale ? "Recompose from current sources" : "Recompose"}
          </Button>
          <Button variant="outline" size="sm" disabled>
            Edit
          </Button>
        </div>
      </div>

      {stale && (
        <div
          className="mx-6 mt-4 flex items-start gap-2.5 rounded-[var(--xr-lg)] px-3.5 py-2.5 text-sm sm:mx-7"
          style={{ background: "var(--skin-surface2)", color: "var(--skin-ink-soft)" }}
        >
          <History
            className="mt-0.5 h-4 w-4 shrink-0"
            aria-hidden
            style={{ color: "var(--skin-ink-faint)" }}
          />
          <p>
            <strong style={{ color: "var(--skin-ink)" }}>
              Two source Objectives have moved since this was composed.
            </strong>{" "}
            The numbers below may understate where you are now.
          </p>
        </div>
      )}

      <div
        className={cn(
          "px-6 py-5 text-lg leading-[1.6] sm:px-7 sm:text-xl",
          isComposing && !prefersReducedMotion && "pitch-composing",
        )}
        style={{ color: "var(--skin-ink)", maxWidth: "33em" }}
      >
        {card.body.map((para, i) => (
          <p key={i} className="mb-3 last:mb-0">
            {para.text.replace(/\.$/, "")}
            <button
              type="button"
              className="ml-0.5 rounded-[3px] border-0 border-b-[1.5px] pb-px text-inherit transition-colors"
              style={{
                borderColor: "var(--skin-accent)",
                background:
                  litIndex === para.sourceIndex ? "var(--skin-accent-soft)" : "transparent",
              }}
              aria-label={`Show source ${para.sourceIndex}`}
              onMouseEnter={() => setLitIndex(para.sourceIndex)}
              onMouseLeave={() => setLitIndex(null)}
              onFocus={() => setLitIndex(para.sourceIndex)}
              onBlur={() => setLitIndex(null)}
              onClick={() => handleCiteClick(para.sourceIndex)}
            >
              .
              <sup
                className="ml-0.5 text-[10px] font-semibold"
                style={{ color: "var(--skin-accent)" }}
              >
                {para.sourceIndex}
              </sup>
            </button>
          </p>
        ))}
      </div>

      <EvidenceRail sources={card.sources} litIndex={litIndex} rowRefs={rowRefs} />
    </div>
  );
}

function EmptyStage({ card }: { card: PitchCard }) {
  return (
    <div
      className="max-w-xl rounded-[var(--xr-lg)] px-6 py-9 sm:px-7 sm:py-11"
      style={{ border: "1px solid var(--skin-line)", background: "var(--skin-surface)" }}
    >
      <h2
        className="text-xl font-semibold tracking-tight"
        style={{ color: "var(--skin-ink)", fontFamily: "var(--skin-font-head)" }}
      >
        {card.name} hasn't been composed yet
      </h2>
      <p className="mt-2.5 max-w-[45ch] text-sm" style={{ color: "var(--skin-ink-soft)" }}>
        This card needs finished work behind it. Complete these Objectives and it will have enough
        to draw from.
      </p>
      <ul className="my-5 flex flex-col gap-2.5">
        {card.unlocksFrom.map((title) => (
          <li
            key={title}
            className="flex items-center gap-2.5 text-sm"
            style={{ color: "var(--skin-ink-soft)" }}
          >
            <CheckCircle2
              className="h-3.5 w-3.5 shrink-0"
              style={{ color: "var(--skin-accent)" }}
              aria-hidden
            />
            {title}
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" disabled>
          Compose card
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link to="/demo/founder/navigator">Open in Navigator</Link>
        </Button>
      </div>
    </div>
  );
}
