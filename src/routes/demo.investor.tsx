import { createFileRoute } from "@tanstack/react-router";
import { InvestorShell } from "@/components/investor/InvestorShell";

export const Route = createFileRoute("/demo/investor")({
  head: () => ({
    meta: [{ title: "Investor — Xcamp" }],
  }),
  component: InvestorShell,
});
