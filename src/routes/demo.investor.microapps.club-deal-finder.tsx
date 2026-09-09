// B4 Stage 2 target — replaced by the real four-stage board build. Placeholder
// only so the nav item resolves at the Stage 1 checkpoint.
import { createFileRoute } from "@tanstack/react-router";
import { MicroAppPlaceholder } from "@/components/demo/MicroAppPlaceholder";

export const Route = createFileRoute("/demo/investor/microapps/club-deal-finder")({
  head: () => ({ meta: [{ title: "Club Deal Finder — Xcamp" }] }),
  component: ClubDealFinderPage,
});

function ClubDealFinderPage() {
  return (
    <MicroAppPlaceholder
      title="Club Deal Finder"
      what="Tracks the projects you are considering across four stages, from passive watching to a signed commitment, and shows how many other investors sit at each stage."
      who="Investors running several possible deals at once."
      drawsFrom={["Projects", "Objectives", "Investor stage counts"]}
    />
  );
}
