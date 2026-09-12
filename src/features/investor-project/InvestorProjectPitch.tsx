import { Presentation } from "lucide-react";
import { ComingSoonPage } from "@/components/ComingSoonPage";
import { PitchScreen } from "@/features/pitch/PitchScreen";
import { DEMO_FOUNDER_PROJECT_ID } from "@/fixtures/pitch";

// Investor-flavored Pitchdeck tab (session brief §4) — the brief calls for
// reusing "the existing Recap-based tool as-is", which the Phase 0 audit
// found doesn't exist: the actual founder pitch tool is fixture-driven
// PitchScreen (src/features/pitch/), unrelated to Recap. Reused verbatim
// here, out of scope for modification per the brief — including its
// Recompose control, which is session-local and non-persisting either way
// (see PitchScreen's own comment). PitchScreen only has cards authored for
// proj-1 (Solari Energy) today, so every other project gets an honest
// empty state instead of silently showing Solari Energy's deck under a
// different project's nav.
export function InvestorProjectPitch({ projectId }: { projectId: string }) {
  if (projectId !== DEMO_FOUNDER_PROJECT_ID) {
    return (
      <ComingSoonPage
        icon={Presentation}
        title="Pitchdeck"
        subtitle="This project hasn't composed a pitch deck yet — Solari Energy is the only one with cards in this demo."
      />
    );
  }
  return <PitchScreen />;
}
