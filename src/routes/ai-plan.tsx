import { createFileRoute } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { AppShell } from "@/components/AppShell";

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
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "60vh",
          gap: 16,
          color: "var(--skin-ink-soft)",
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 14,
            border: "1.5px solid var(--skin-line)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--skin-accent)",
          }}
        >
          <Sparkles size={26} />
        </div>
        <div style={{ textAlign: "center" }}>
          <p
            style={{
              fontSize: 18,
              fontWeight: 600,
              color: "var(--skin-ink)",
              marginBottom: 6,
            }}
          >
            AI Plan
          </p>
          <p style={{ fontSize: 14, color: "var(--skin-ink-soft)", maxWidth: 320 }}>
            AI-generated project planning and roadmapping — coming soon.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
