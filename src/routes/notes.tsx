import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { BookText, Mic } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PageHeroShell } from "@/components/PageHeroShell";
import { JournalFlow } from "@/components/JournalFlow";
import { VoiceTranscriber } from "@/components/VoiceTranscriber";
import { useBrand } from "@/lib/brand";

export const Route = createFileRoute("/notes")({
  head: () => ({
    meta: [
      { title: "Notes — Xcamp Journal" },
      { name: "description", content: "Capture and manage your notes natively in the Xcamp ecosystem." },
    ],
  }),
  component: NotesPage,
});

type Tab = "journal" | "voice";

function NotesPage() {
  const brand = useBrand();
  const [tab, setTab] = useState<Tab>("voice");
  const [draft, setDraft] = useState<{ text: string; key: number } | null>(null);

  const handleCreateEntry = (text: string) => {
    setDraft({ text, key: Date.now() });
    setTab("journal");
  };

  return (
    <AppShell>
      <PageHeroShell
        logo={<img src={brand.logoUrl} alt={brand.name} className="h-6 sm:h-8 w-auto" />}
        title="Notes"
        subtitle="Capture and manage your notes in the Xcamp ecosystem."
      >
        <div
          className="flex items-center gap-1 px-3 pt-3"
          style={{ borderBottom: "1px solid var(--skin-line)" }}
        >
          <TabButton active={tab === "journal"} onClick={() => setTab("journal")} icon={<BookText size={15} />}>
            Notes
          </TabButton>
          <TabButton active={tab === "voice"} onClick={() => setTab("voice")} icon={<Mic size={15} />}>
            Voice
          </TabButton>
        </div>

        {tab === "journal" ? (
          <JournalFlow draft={draft} />
        ) : (
          <div className="p-4 sm:p-6">
            <VoiceTranscriber onCreateNote={handleCreateEntry} createLabel="Create note" />
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
