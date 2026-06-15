import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BookText, Mic } from "lucide-react";
import { useAuth } from "@/contexts/auth";
import { PageHeroShell } from "@/components/PageHeroShell";
import { Journal } from "@/components/Journal";
import { VoiceTranscriber } from "@/components/VoiceTranscriber";
import xcampLogo from "@/assets/xcamp-logo.svg.asset.json";

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
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("voice");
  const [draft, setDraft] = useState<{ body: string; key: number } | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ color: "var(--skin-ink-soft)" }}>
        Loading…
      </div>
    );
  }

  const handleCreateNote = (text: string) => {
    const escaped = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    setDraft({ body: `<p>${escaped}</p>`, key: Date.now() });
    setTab("journal");
  };

  return (
    <PageHeroShell
      logo={<img src={xcampLogo.url} alt="Xcamp" className="h-6 sm:h-8 w-auto" />}
      title="Your Journal"
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
