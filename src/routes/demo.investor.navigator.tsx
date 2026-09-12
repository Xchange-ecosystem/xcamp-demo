import { createFileRoute } from "@tanstack/react-router";
import { EcosystemNavigatorScreen } from "@/features/ecosystem-navigator/EcosystemNavigatorScreen";

export const Route = createFileRoute("/demo/investor/navigator")({
  head: () => ({ meta: [{ title: "Ecosystem Navigator — Xcamp" }] }),
  component: EcosystemNavigatorScreen,
});
