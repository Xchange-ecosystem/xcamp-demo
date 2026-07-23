import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Mic, StickyNote } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PageHeroShell } from "@/components/PageHeroShell";
import { NotesBrowser } from "@/components/NotesBrowser";
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

type Tab = "notes" | "voice";

function NotesPage() {
  const brand = useBrand();
  const [tab, setTab] = useState<Tab>("voice");
  const [draft, setDraft] = useState<{ body: string; key: number } | null>(null);

  const handleCreateNote = (text: string) => {
    setDraft({ body: text, key: Date.now() });
    setTab("notes");
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
          <TabButton active={tab === "notes"} onClick={() => setTab("notes")} icon={<StickyNote size={15} />}>
            Notes
          </TabButton>
          <TabButton active={tab === "voice"} onClick={() => setTab("voice")} icon={<Mic size={15} />}>
            Voice
          </TabButton>
        </div>

        {tab === "notes" ? (
          <NotesBrowser draft={draft} />
        ) : (
          <div className="p-4 sm:p-6">
            <VoiceTranscriber onCreateNote={handleCreateNote} createLabel="Create note" />
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
