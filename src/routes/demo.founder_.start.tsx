// The `_` after `founder` escapes nesting under demo.founder.tsx's
// FounderShell layout (same pattern as project.$projectId_.goals.tsx) —
// this route needs to be full-bleed with no Navrail/AltitudeRail, not
// wrapped in DemoShell like every other /demo/founder/* screen.
import { createFileRoute } from "@tanstack/react-router";
import { PersonaStartScreen } from "@/components/demo/start/PersonaStartScreen";
import { PERSONA_START } from "@/fixtures/personaStart";

export const Route = createFileRoute("/demo/founder_/start")({
  head: () => ({ meta: [{ title: "Welcome — Xcamp" }] }),
  component: () => <PersonaStartScreen config={PERSONA_START.founder} />,
});
