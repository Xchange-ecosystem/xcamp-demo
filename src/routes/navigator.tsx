import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { NavigatorBrowser } from "@/components/navigator/NavigatorBrowser";

export const Route = createFileRoute("/navigator")({
  head: () => ({
    meta: [
      { title: "Navigator — Xcamp" },
      { name: "description", content: "Browse project objectives and tasks and open them to edit details." },
    ],
  }),
  component: NavigatorPage,
});

function NavigatorPage() {
  return (
    <AppShell>
      <NavigatorBrowser />
    </AppShell>
  );
}
