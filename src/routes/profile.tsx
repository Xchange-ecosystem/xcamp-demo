import { createFileRoute } from "@tanstack/react-router";
import { ProfileShell } from "@/components/profile/ProfileShell";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [{ title: "Profile — Xcamp" }],
  }),
  component: ProfileShell,
});
