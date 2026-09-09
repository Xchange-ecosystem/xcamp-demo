import { createFileRoute } from "@tanstack/react-router";
import { InvestorReadinessScreen } from "@/features/readiness/InvestorReadinessScreen";

export const Route = createFileRoute("/demo/investor/microapps/readiness")({
  head: () => ({
    meta: [
      { title: "Readiness — Xcamp" },
      {
        name: "description",
        content: "Evidence by dimension, and what would stall a term sheet.",
      },
    ],
  }),
  component: InvestorReadinessPage,
});

function InvestorReadinessPage() {
  return <InvestorReadinessScreen />;
}
