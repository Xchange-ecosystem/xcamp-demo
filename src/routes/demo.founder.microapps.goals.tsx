// Goals microapp — clone of the real /project/:projectId/goals page (see
// src/components/demo/microapps/GoalsMicroApp.tsx for the adaptation
// details: flat styling instead of the real page's hero background, backed
// by the fixture data CompanionInfoPanel already reads instead of Supabase).
import { createFileRoute } from "@tanstack/react-router";
import { GoalsMicroApp } from "@/components/demo/microapps/GoalsMicroApp";

export const Route = createFileRoute("/demo/founder/microapps/goals")({
  head: () => ({ meta: [{ title: "Goals — Xcamp" }] }),
  component: MicroAppsGoalsPage,
});

function MicroAppsGoalsPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <GoalsMicroApp />
    </div>
  );
}
