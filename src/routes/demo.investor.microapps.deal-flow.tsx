import { createFileRoute } from "@tanstack/react-router";
import { MicroAppPlaceholder } from "@/components/demo/MicroAppPlaceholder";

export const Route = createFileRoute("/demo/investor/microapps/deal-flow")({
  head: () => ({ meta: [{ title: "Deal-Flow & -Share — Xcamp" }] }),
  component: DealFlowPage,
});

function DealFlowPage() {
  return (
    <MicroAppPlaceholder
      title="Deal-Flow & -Share"
      what="Surfaces projects moving through active funding rounds across the ecosystem, so you see momentum before it is publicly announced."
      who="Investors sourcing new opportunities."
      drawsFrom={["Objectives", "Funding stage", "Ecosystem activity"]}
    />
  );
}
