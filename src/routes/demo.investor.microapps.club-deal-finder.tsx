import { createFileRoute } from "@tanstack/react-router";
import { ClubDealFinderScreen } from "@/features/club-deal-finder/ClubDealFinderScreen";

export const Route = createFileRoute("/demo/investor/microapps/club-deal-finder")({
  head: () => ({
    meta: [
      { title: "Club Deal Finder — Xcamp" },
      {
        name: "description",
        content: "Your deal pipeline across four stages, with per-stage investor interest.",
      },
    ],
  }),
  component: ClubDealFinderPage,
});

function ClubDealFinderPage() {
  return <ClubDealFinderScreen />;
}
