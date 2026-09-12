// Navigator / Board — see src/components/demo/navigator/NavigatorBoardView.tsx.
import { createFileRoute } from "@tanstack/react-router";
import { NavigatorBoardView } from "@/components/demo/navigator/NavigatorBoardView";

export const Route = createFileRoute("/demo/founder/navigator/board")({
  head: () => ({ meta: [{ title: "Navigator · Board — Xcamp" }] }),
  component: NavigatorBoardView,
});
