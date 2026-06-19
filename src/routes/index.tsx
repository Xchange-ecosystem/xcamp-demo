import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { BookText, Mic } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PageHeroShell } from "@/components/PageHeroShell";
import { Journal } from "@/components/Journal";
import { VoiceTranscriber } from "@/components/VoiceTranscriber";
import { useBrand } from "@/lib/brand";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Xcamp Journal" },
      { name: "description", content: "Capture notes and voice transcriptions natively in the Xcamp ecosystem." },
    ],
  }),
  component: HomePage,
});

type Tab = "journal" | "voice";

function HomePage() {
  const brand = useBrand();
  const [tab, setTab] = useState<Tab>("voice");
  const [draft, setDraft] = useState<{ body: string; key: number } | null>(null);

  const handleCreateNote = (text: string) => {
    const escaped = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    setDraft({ body: `<p>${escaped}</p>`, key: Date.now() });
    setTab("journal");
  };

  return (
    <AppShell>
      <PageHeroShell
        logo={<img src={brand.logoUrl} alt={brand.name} className="h-6 sm:h-8 w-auto" />}
        title="Your Notes"
        subtitle="Write notes or capture your voice — all in one place."
      >
        {/* Tabs */}
        <div
          className="flex items-center gap-1 px-3 pt-3"
          style={{ borderBottom: "1px solid var(--skin-line)" }}
        >
          <TabButton active={tab === "journal"} onClick={() => setTab("journal")} icon={<BookText size={15} />}>
            Journal
          </TabButton>
          <TabButton active={tab === "voice"} onClick={() => setTab("voice")} icon={<Mic size={15} />}>
            Voice
          </TabButton>
        </div>

        {tab === "journal" ? (
          <Journal embedded defaultCollapsed draft={draft} />
        ) : (
          <div className="p-4 sm:p-6">
            <VoiceTranscriber onCreateNote={handleCreateNote} />
          </div>
        )}
      </PageHeroShell>
    </AppShell>
  );
}


function TabButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "10px 16px",
        fontSize: 14,
        fontWeight: 600,
        background: "none",
        border: "none",
        cursor: "pointer",
        color: active ? "var(--skin-accent)" : "var(--skin-ink-soft)",
        borderBottom: `2px solid ${active ? "var(--skin-accent)" : "transparent"}`,
        marginBottom: -1,
      }}
    >
      {icon}
      {children}
    </button>
  );
}
