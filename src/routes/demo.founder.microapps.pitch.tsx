import { createFileRoute } from "@tanstack/react-router";
import { PitchScreen } from "@/features/pitch/PitchScreen";

export const Route = createFileRoute("/demo/founder/microapps/pitch")({
  head: () => ({ meta: [{ title: "Pitch — Xcamp" }] }),
  component: PitchScreen,
});
