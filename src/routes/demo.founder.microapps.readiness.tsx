// Readiness microapp — matching review (left rail of criteria, center stage
// of confirmed matches, right rail of pending Copilot suggestions). See
// src/components/demo/microapps/ReadinessMicroApp.tsx for the build notes.
import { createFileRoute } from "@tanstack/react-router";
import { ReadinessMicroApp } from "@/components/demo/microapps/ReadinessMicroApp";

export const Route = createFileRoute("/demo/founder/microapps/readiness")({
  head: () => ({ meta: [{ title: "Readiness — Xcamp" }] }),
  component: ReadinessMicroApp,
});
