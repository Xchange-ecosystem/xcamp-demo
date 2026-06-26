import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { BookText, Mic } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PageHeroShell } from "@/components/PageHeroShell";
import { JournalFlow } from "@/components/JournalFlow";
import { VoiceTranscriber } from "@/components/VoiceTranscriber";
import { useBrand } from "@/lib/brand";
import { ChiCompanionPanel } from "@xchange/companion";

export const Route = createFileRoute("/journal")({
  head: () => ({
    meta: [
      { title: "Journal — Xcamp Journal" },
      { name: "description", content: "Turn journal entries and voice notes into project-linked notes in the Xcamp ecosystem." },
    ],
  }),
  component: JournalPage,
});

type Tab = "journal" | "voice";

function JournalPage() {
  const brand = useBrand();
  const [tab, setTab] = useState<Tab>("voice");
  const [draft, setDraft] = useState<{ text: string; key: number } | null>(null);

  const handleCreateEntry = (text: string) => {
    setDraft({ text, key: Date.now() });
    setTab("journal");
  };

  return (
    <AppShell>
      <div style={{ display: "flex", height: "100vh" }}>
        <div style={{ flex: 1, overflowY: "auto" }}>
          <PageHeroShell
            logo={<img src={brand.logoUrl} alt={brand.name} className="h-6 sm:h-8 w-auto" />}
            title="Journal"
            subtitle="Capture your thoughts by writing or voice — we'll turn them into linked notes."
          >
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
              <JournalFlow draft={draft} />
            ) : (
              <div className="p-4 sm:p-6">
                <VoiceTranscriber onCreateNote={handleCreateEntry} createLabel="Create journal entry" />
              </div>
            )}
          </PageHeroShell>
        </div>
        <div style={{ width: "380px", borderLeft: "1px solid var(--skin-line)", flexShrink: 0 }}>
          <ChiCompanionPanel
            tenantId={import.meta.env.VITE_TENANT_ID ?? ""}
            userId={import.meta.env.VITE_USER_ID ?? ""}
            altitude={1}
            context={{ projectLabel: "Journal" }}
            onCardAccept={(card, result) => console.log("Chi AI card accepted", card, result)}
            onCardDismiss={(card) => console.log("Chi AI card dismissed", card)}
            style={{ height: "100vh" }}
          />
        </div>
      </div>
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
