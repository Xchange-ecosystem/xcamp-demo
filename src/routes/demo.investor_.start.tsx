// See demo.founder_.start.tsx for why the `_` escape is needed here too.
import { createFileRoute } from "@tanstack/react-router";
import { PersonaStartScreen } from "@/components/demo/start/PersonaStartScreen";
import { PERSONA_START } from "@/fixtures/personaStart";

export const Route = createFileRoute("/demo/investor_/start")({
  head: () => ({ meta: [{ title: "Welcome — Xcamp" }] }),
  component: () => <PersonaStartScreen config={PERSONA_START.investor} />,
});
