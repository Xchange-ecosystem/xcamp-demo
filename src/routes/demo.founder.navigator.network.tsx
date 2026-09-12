// Navigator / Network — see src/components/demo/navigator/NavigatorNetworkView.tsx.
import { createFileRoute } from "@tanstack/react-router";
import { NavigatorNetworkView } from "@/components/demo/navigator/NavigatorNetworkView";

export const Route = createFileRoute("/demo/founder/navigator/network")({
  head: () => ({ meta: [{ title: "Navigator · Network — Xcamp" }] }),
  component: NavigatorNetworkView,
});
