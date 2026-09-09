import { createFileRoute } from "@tanstack/react-router";
import { DueDiligenceScreen } from "@/features/due-diligence/DueDiligenceScreen";

export const Route = createFileRoute("/demo/investor/microapps/due-diligence")({
  head: () => ({
    meta: [
      { title: "Due Diligence — Xcamp" },
      {
        name: "description",
        content: "Read-only trust card and generated due-diligence stage for one project.",
      },
    ],
  }),
  component: DueDiligencePage,
});

function DueDiligencePage() {
  return <DueDiligenceScreen />;
}
