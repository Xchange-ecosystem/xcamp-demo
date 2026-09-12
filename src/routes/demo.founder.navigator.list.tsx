// Navigator / List — see src/components/demo/navigator/NavigatorListView.tsx.
import { createFileRoute } from "@tanstack/react-router";
import { NavigatorListView } from "@/components/demo/navigator/NavigatorListView";

export const Route = createFileRoute("/demo/founder/navigator/list")({
  head: () => ({ meta: [{ title: "Navigator · List — Xcamp" }] }),
  component: NavigatorListView,
});
