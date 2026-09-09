import { createFileRoute } from "@tanstack/react-router";
import { MicroAppPlaceholder } from "@/components/demo/MicroAppPlaceholder";

export const Route = createFileRoute("/demo/investor/microapps/secondary-market")({
  head: () => ({ meta: [{ title: "Secondary Market — Xcamp" }] }),
  component: SecondaryMarketPage,
});

function SecondaryMarketPage() {
  return (
    <MicroAppPlaceholder
      title="Secondary Market"
      what="Lets participants trade vested positions with other ecosystem members under the fund's transfer rules."
      who="Investors and collaborators holding settled value."
      drawsFrom={["Wallet ledger", "Credit state", "Fund transferability rules"]}
    />
  );
}
