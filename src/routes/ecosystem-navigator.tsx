import { createFileRoute } from "@tanstack/react-router";
import { Map } from "lucide-react";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/ecosystem-navigator")({
  head: () => ({
    meta: [
      { title: "Ecosystem Navigator — Xcamp" },
      { name: "description", content: "Browse all projects in the Xcamp ecosystem." },
    ],
  }),
  component: EcosystemNavigatorPage,
});

function EcosystemNavigatorPage() {
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
          <Map size={26} />
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
            Ecosystem Navigator
          </p>
          <p style={{ fontSize: 14, color: "var(--skin-ink-soft)", maxWidth: 320 }}>
            Browse all projects across the ecosystem — coming soon.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
