import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useActiveProject } from "@/contexts/active-project";
import { useQuery } from "@tanstack/react-query";
import { MessageSquarePlus, RefreshCw, Volume2, VolumeX } from "lucide-react";
import { CompanionShell } from "@/components/CompanionShell";
import { ChatThread } from "@/components/companion/ChatThread";
import { useHeroImage } from "@/lib/useHeroImage";
import { useAuth } from "@/contexts/auth";
import { listProjectsFull } from "@/lib/xcamp-api";
import { useCompanionSession } from "@/lib/useCompanionSession";
import { useVox } from "@/hooks/useVox";
import type { ProjectFull } from "@/types/xcamp";
import type { AICard } from "@xchange/client";

// ─── CSS custom properties for the glass panel ────────────────────────────────
const GLASS_STYLE: React.CSSProperties = {
  "--glass-blur": "18px",
  "--glass-bg-light": "rgba(255,255,255,0.55)",
  "--glass-bg-dark": "rgba(18,10,30,0.55)",
  "--glass-border": "rgba(255,255,255,0.18)",
  "--glass-shadow": "0 8px 40px rgba(0,0,0,0.28)",
} as React.CSSProperties;

const SHORTCUT_PILLS = [
  { id: "note", label: "Quick note" },
  { id: "objective", label: "Set objective" },
  { id: "reflect", label: "Reflect" },
  { id: "plan", label: "Plan today" },
];

export const Route = createFileRoute("/home")({
  head: () => ({
    meta: [
      { title: "Chi Companion" },
      { name: "description", content: "Your AI companion for the Xcamp ecosystem." },
    ],
  }),
  component: CompanionHomePage,
});

// ─── Conversation controller step ─────────────────────────────────────────────
type ConvStep = "welcome" | "project-select" | "inside-project";

function CompanionHomePage() {
  const { user: authUser } = useAuth();
  const { activeProjectId, setActiveProjectId } = useActiveProject();

  const session = useCompanionSession(authUser);

  const [step, setStep] = useState<ConvStep>("welcome");
  const [activeProject, setActiveProject] = useState<ProjectFull | null>(null);
  const gridMsgIdRef = useRef<string | null>(null);

  const [ttsEnabled, setTtsEnabled] = useState(false);

  const projectBgUrl =
    step === "inside-project" && activeProject?.feature_image
      ? activeProject.feature_image
      : null;
  const { url: heroBgUrl, reload: reloadHero, canReload } = useHeroImage("companion");
  const bgUrl = projectBgUrl ?? heroBgUrl;

  // Apply background image directly on <html> — bypasses all React layer stacking
  useEffect(() => {
    if (!bgUrl) return;
    console.log("[hero] setting background image:", bgUrl);
    document.documentElement.style.cssText += `; background-image: url("${bgUrl}"); background-size: cover; background-position: center; background-repeat: no-repeat; background-attachment: fixed;`;

    return () => {
      document.documentElement.style.backgroundImage = "";
      document.documentElement.style.backgroundSize = "";
      document.documentElement.style.backgroundPosition = "";
      document.documentElement.style.backgroundRepeat = "";
      document.documentElement.style.backgroundAttachment = "";
    };
  }, [bgUrl]);

  const { data: projects = [] } = useQuery({
    queryKey: ["projects-full", authUser?.centralId],
    queryFn: () => listProjectsFull(authUser!),
    enabled: !!authUser,
  });

  const vox = useVox();
  const altitude = 1 as const;

  const [draft, setDraft] = useState("");
  const [typingMessageId, setTypingMessageId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Resolves after the typewriter would finish for a given text at 38ms/char.
  const waitForTyping = (text: string) =>
    new Promise<void>((resolve) => setTimeout(resolve, text.length * 38));

  const isNewDay = (dateStr: string) => {
    const sessionDate = new Date(dateStr).toDateString();
    const today = new Date().toDateString();
    return sessionDate !== today;
  };

  const welcomeFiredRef = useRef(false);
  useEffect(() => {
    if (session.loading || welcomeFiredRef.current) return;

    // If the loaded conversation is from a previous day, start fresh
    if (
      session.conversationId &&
      session.conversationCreatedAt &&
      session.messages.length > 0 &&
      isNewDay(session.conversationCreatedAt)
    ) {
      void session.newSession().then(() => {
        setActiveProjectId(null);
        localStorage.removeItem("xcamp-active-project");
        setStep("welcome");
        setActiveProject(null);
        welcomeFiredRef.current = false;
        branchFiredRef.current = false;
        gridMsgIdRef.current = null;
      });
      return;
    }

    if (session.messages.length > 0) {
      welcomeFiredRef.current = true;
      return;
    }
    welcomeFiredRef.current = true;

    // Fresh session — clear any lingering project selection
    setActiveProjectId(null);
    localStorage.removeItem("xcamp-active-project");

    async function dispatchWelcome() {
      const MSG1 = "Hello! Let's make the most of today. What would you like to work on?";
      const id1 = await session.appendChiMessage(MSG1);
      setTypingMessageId(id1);
      await waitForTyping(MSG1);
      setTypingMessageId(null);

      const MSG2 = "Let's start by jumping into a project.";
      const id2 = await session.appendChiMessage(MSG2);
      setTypingMessageId(id2);
      await waitForTyping(MSG2);
      setTypingMessageId(null);

      const gridId = await session.appendComponentMessage("project-grid");
      gridMsgIdRef.current = gridId;
      setStep("project-select");
    }

    void dispatchWelcome();
  }, [session.loading, session.messages.length, session.conversationCreatedAt]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleProjectSelect = useCallback(
    async (project: ProjectFull, silent = false) => {
      setActiveProject(project);
      setActiveProjectId(project.id);
      if (session.conversationId) {
        supabase
          .from("jarvix_conversations")
          .update({ project_id: project.id })
          .eq("id", session.conversationId)
          .then();
      }
      if (gridMsgIdRef.current) session.resolveComponent(gridMsgIdRef.current);
      if (!silent) await session.appendUserMessage(project.name);
      setStep("inside-project");

      let reply = "Here's what I suggest you focus on today.";
      let cards: AICard[] = [];

      setIsLoading(true);
      try {
        const res = await vox.call({
          message: `I selected the project: ${project.name}. What should I focus on?`,
          project_id: project.id,
          objective_id: "",
          tenant_id: authUser!.tenantId,
          altitude,
          aiPersona: "guide",
          context_scope: "project",
        });
        reply = res.reply_markdown;
        cards = res.cards ?? [];
      } catch (err) {
        console.error("[Chi] Vox call failed:", err);
      } finally {
        setIsLoading(false);
      }

      const chiId = await session.appendChiMessage(reply);
      setTypingMessageId(chiId);
      await waitForTyping(reply);
      setTypingMessageId(null);

      if (cards.length > 0) {
        await session.appendComponentMessage("action-cards", { cards } as Record<string, unknown>);
      }
    },
    [session, vox, authUser, altitude, setActiveProjectId], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const branchFiredRef = useRef(false);
  useEffect(() => {
    if (step !== "project-select") return;
    if (session.loading) return;
    if (branchFiredRef.current) return;
    if (projects.length === 0) return;

    branchFiredRef.current = true;

    if (projects.length === 1) {
      void handleProjectSelect(projects[0], true);
    }
  }, [step, session.loading, projects.length, handleProjectSelect]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync sidebar project selection into the companion flow
  useEffect(() => {
    if (!activeProjectId) return;
    if (activeProject?.id === activeProjectId) return;
    const project = projects.find((p) => p.id === activeProjectId);
    if (project) void handleProjectSelect(project, false);
  }, [activeProjectId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleNewSession = useCallback(async () => {
    if (!confirm("Start a new conversation?")) return;
    await session.newSession();
    setStep("welcome");
    setActiveProject(null);
    welcomeFiredRef.current = false;
    branchFiredRef.current = false;
    gridMsgIdRef.current = null;
  }, [session]);

  const handleSend = useCallback(async () => {
    const text = draft.trim();
    if (!text || isLoading) return;
    setDraft("");
    await session.appendUserMessage(text);

    let reply = "Got it — I'll help with that soon.";
    let cards: AICard[] = [];

    setIsLoading(true);
    try {
      const res = await vox.call({
        message: text,
        project_id: activeProject?.id ?? "",
        objective_id: "",
        tenant_id: authUser!.tenantId,
        altitude,
        aiPersona: "guide",
      });
      reply = res.reply_markdown;
      cards = res.cards ?? [];
    } catch (err) {
      console.error("[Chi] Vox call failed:", err);
    } finally {
      setIsLoading(false);
    }

    const chiId = await session.appendChiMessage(reply);
    setTypingMessageId(chiId);
    await waitForTyping(reply);
    setTypingMessageId(null);

    if (cards.length > 0) {
      await session.appendComponentMessage("action-cards", { cards } as Record<string, unknown>);
    }
  }, [draft, isLoading, session, vox, activeProject, authUser, altitude]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleShortcut = useCallback(
    async (id: string) => {
      if (id === "note") {
        await session.appendUserMessage("Quick note");
        await session.appendChiMessage("Got it — I'll help with that soon.");
      } else if (id === "objective") {
        await session.appendUserMessage("Set objective");
        await session.appendChiMessage("Got it — I'll help with that soon.");
      }
    },
    [session],
  );

  return (
    <CompanionShell>
      {/* Scrim — sits above the <html> background image */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 1,
          background: "rgba(0,0,0,0.38)",
          pointerEvents: "none",
        }}
      />

      {/* Top chrome */}
      <TopChrome
        ttsEnabled={ttsEnabled}
        onTtsToggle={() => setTtsEnabled((v) => !v)}
        onReload={reloadHero}
        canReload={canReload}
        onNewSession={handleNewSession}
      />

      {/* Glass panel */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 10,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            ...GLASS_STYLE,
            pointerEvents: "auto",
            width: "min(580px, 92vw)",
            height: "min(600px, 78vh)",
            display: "flex",
            flexDirection: "column",
            borderRadius: 20,
            background: "var(--glass-bg-dark, rgba(18,10,30,0.55))",
            border: "1px solid var(--glass-border, rgba(255,255,255,0.18))",
            boxShadow: "var(--glass-shadow, 0 8px 40px rgba(0,0,0,0.28))",
            backdropFilter: "blur(var(--glass-blur, 18px))",
            WebkitBackdropFilter: "blur(var(--glass-blur, 18px))",
            color: "white",
            overflow: "hidden",
          }}
        >
          <div style={{ flex: 1, overflowY: "auto", padding: "20px 20px 8px" }}>
            <ChatThread
              messages={session.messages}
              projects={projects}
              onProjectSelect={handleProjectSelect}
              onCreateProject={() => {/* CC-3 scope */}}
              typingMessageId={typingMessageId ?? undefined}
              isLoading={isLoading}
              onCardConfirm={(card) => console.log("[Chi] card confirmed:", card.id)}
              onCardDismiss={(card) => console.log("[Chi] card dismissed:", card.id)}
            />
          </div>

          <div
            style={{
              flexShrink: 0,
              borderTop: "1px solid rgba(255,255,255,0.1)",
              padding: "10px 14px 12px",
              display: "flex",
              gap: 8,
              alignItems: "flex-end",
            }}
          >
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void handleSend();
                }
              }}
              rows={2}
              placeholder={isLoading ? "Chi is thinking…" : "Ask Chi anything…"}
              disabled={isLoading}
              style={{
                flex: 1,
                resize: "none",
                background: "rgba(255,255,255,0.1)",
                border: "1px solid rgba(255,255,255,0.18)",
                borderRadius: 10,
                color: "white",
                fontSize: 14,
                padding: "8px 12px",
                outline: "none",
                fontFamily: "inherit",
                opacity: isLoading ? 0.5 : 1,
              }}
            />
            <button
              onClick={() => void handleSend()}
              disabled={!draft.trim() || isLoading}
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: "var(--skin-accent-gradient)",
                border: "none",
                color: "white",
                cursor: draft.trim() && !isLoading ? "pointer" : "not-allowed",
                opacity: draft.trim() && !isLoading ? 1 : 0.4,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 16,
                flexShrink: 0,
              }}
            >
              ➤
            </button>
          </div>
        </div>
      </div>

      {/* Shortcut pill bar */}
      <ShortcutPillBar onShortcut={handleShortcut} />
    </CompanionShell>
  );
}

// ─── Top chrome ──────────────────────────────────────────────────────────────
function TopChrome({
  ttsEnabled,
  onTtsToggle,
  onReload,
  canReload,
  onNewSession,
}: {
  ttsEnabled: boolean;
  onTtsToggle: () => void;
  onReload: () => void;
  canReload: boolean;
  onNewSession: () => void;
}) {
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        right: 0,
        zIndex: 20,
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "12px 16px",
        pointerEvents: "auto",
      }}
    >
      <ChromeButton onClick={onNewSession} title="New conversation">
        <MessageSquarePlus size={15} />
      </ChromeButton>
      {canReload && (
        <ChromeButton onClick={onReload} title="Reload background">
          <RefreshCw size={15} />
        </ChromeButton>
      )}
      <ChromeButton onClick={onTtsToggle} title={ttsEnabled ? "Disable TTS" : "Enable TTS"}>
        {ttsEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
      </ChromeButton>
    </div>
  );
}

function ChromeButton({
  children,
  onClick,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 34,
        height: 34,
        borderRadius: "50%",
        background: "rgba(255,255,255,0.15)",
        border: "1px solid rgba(255,255,255,0.2)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        color: "white",
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

// ─── Shortcut pill bar ────────────────────────────────────────────────────────
function ShortcutPillBar({ onShortcut }: { onShortcut: (id: string) => void }) {
  return (
    <div
      style={{
        position: "fixed",
        bottom: 28,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 20,
        display: "flex",
        gap: 8,
        padding: "8px 16px",
        borderRadius: "var(--xr-pill, 999px)",
        background: "rgba(18,10,30,0.6)",
        border: "1px solid rgba(255,255,255,0.18)",
        backdropFilter: "blur(18px)",
        WebkitBackdropFilter: "blur(18px)",
        boxShadow: "0 4px 24px rgba(0,0,0,0.3)",
      }}
    >
      {SHORTCUT_PILLS.map((pill) => (
        <button
          key={pill.id}
          onClick={() => onShortcut(pill.id)}
          style={{
            all: "unset",
            cursor: "pointer",
            padding: "6px 14px",
            borderRadius: "var(--xr-pill, 999px)",
            fontSize: 13,
            fontWeight: 500,
            color: "rgba(255,255,255,0.85)",
            background: "rgba(255,255,255,0.1)",
          }}
        >
          {pill.label}
        </button>
      ))}
    </div>
  );
}
