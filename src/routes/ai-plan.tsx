import { createFileRoute } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ComingSoonPage } from "@/components/ComingSoonPage";

export const Route = createFileRoute("/ai-plan")({
  head: () => ({
    meta: [
      { title: "AI Plan — Xcamp" },
      { name: "description", content: "AI-generated project planning — coming soon." },
    ],
  }),
  component: AiPlanPage,
});

function AiPlanPage() {
  return (
    <AppShell>
      <ComingSoonPage
        icon={Sparkles}
        title="AI Plan"
        subtitle="This feature is not activated in the demo. Contact admin@xchange.eco."
      />
    </AppShell>
  );
}
