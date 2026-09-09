// B4 Stage 3 target — replaced by the investor-flavoured Readiness build.
// Placeholder only so the nav item resolves at the Stage 1 checkpoint.
import { createFileRoute } from "@tanstack/react-router";
import { MicroAppPlaceholder } from "@/components/demo/MicroAppPlaceholder";

export const Route = createFileRoute("/demo/investor/microapps/readiness")({
  head: () => ({ meta: [{ title: "Readiness — Xcamp" }] }),
  component: InvestorReadinessPage,
});

function InvestorReadinessPage() {
  return (
    <MicroAppPlaceholder
      title="Readiness"
      what="Rates how prepared a project is for the raise it says it is running, and names the gaps that would stall a term sheet."
      who="Investors sizing up how much work a deal still needs before it closes."
      drawsFrom={["Objectives", "Proof counts", "Evaluations", "Funding stage"]}
    />
  );
}
