import { createFileRoute } from "@tanstack/react-router";
import { FounderShell } from "@/components/founder/FounderShell";

export const Route = createFileRoute("/founder")({
  head: () => ({
    meta: [{ title: "Founder — Xcamp" }],
  }),
  component: FounderShell,
});
