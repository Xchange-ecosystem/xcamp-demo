import { createFileRoute } from "@tanstack/react-router";
import { InvestorHomeScreen } from "@/features/investor-portfolio/InvestorHomeScreen";

// Ecosystem-level landing page ("Home" — session brief revision §2). Nav/
// shell live one level up, in InvestorShell (src/routes/demo.investor.tsx),
// shared with every other /demo/investor/* route.
export const Route = createFileRoute("/demo/investor/")({
  head: () => ({
    meta: [
      { title: "Home — Xcamp" },
      {
        name: "description",
        content:
          "Ranked portfolio, project updates, and ecosystem metrics for investors and operators.",
      },
    ],
  }),
  component: InvestorHomeScreen,
});
