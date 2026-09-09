import { useRef, useState } from "react";
import { DEMO_FOUNDER_PROJECT_ID, PITCH_CARDS, type PitchCardState } from "@/fixtures/pitch";
import { getProjectById } from "@/fixtures/projects";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { PitchMasthead } from "./PitchMasthead";
import { PitchCardStrip } from "./PitchCardStrip";
import { PitchStage } from "./PitchStage";

interface RecomposeOverride {
  state: PitchCardState;
  composedAt: string;
}

// Session-local only: recomposing a card resets on reload/navigation away
// and back to a fresh mount of this screen — no fixture mutation, no
// persistence, per the frontend-fixtures-only standing rule.
export function PitchScreen() {
  const project = getProjectById(DEMO_FOUNDER_PROJECT_ID);
  const [activeId, setActiveId] = useState(PITCH_CARDS[0].id);
  const [overrides, setOverrides] = useState<Record<string, RecomposeOverride>>({});
  const [composingId, setComposingId] = useState<string | null>(null);
  const prefersReducedMotion = usePrefersReducedMotion();
  const composeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (!project) return null;

  const cards = PITCH_CARDS.map((card) => {
    const override = overrides[card.id];
    return override ? { ...card, ...override } : card;
  });
  const activeCard = cards.find((c) => c.id === activeId) ?? cards[0];

  const handleRecompose = (id: string) => {
    setOverrides((prev) => ({ ...prev, [id]: { state: "fresh", composedAt: "just now" } }));

    if (composeTimeoutRef.current) clearTimeout(composeTimeoutRef.current);
    if (prefersReducedMotion) {
      setComposingId(null);
      return;
    }
    setComposingId(id);
    // Total duration of the staggered settle animation (last delay .32s +
    // .5s run) — clears the flag so revisiting this card later doesn't
    // replay it.
    composeTimeoutRef.current = setTimeout(() => setComposingId(null), 820);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-hidden px-6 py-6 sm:px-7">
      <PitchMasthead project={project} cardStates={cards.map((c) => c.state)} />
      <PitchCardStrip cards={cards} activeId={activeId} onSelect={setActiveId} />
      <PitchStage
        key={activeCard.id}
        card={activeCard}
        isComposing={composingId === activeCard.id}
        onRecompose={handleRecompose}
      />
    </div>
  );
}
