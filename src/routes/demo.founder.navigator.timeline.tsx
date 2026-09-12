// Navigator / Timeline — see src/components/demo/navigator/NavigatorTimelineView.tsx.
import { createFileRoute } from "@tanstack/react-router";
import { NavigatorTimelineView } from "@/components/demo/navigator/NavigatorTimelineView";

export const Route = createFileRoute("/demo/founder/navigator/timeline")({
  head: () => ({ meta: [{ title: "Navigator · Timeline — Xcamp" }] }),
  component: NavigatorTimelineView,
});
