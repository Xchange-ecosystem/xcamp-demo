import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MessageSquarePlus, RefreshCw, Volume2, VolumeX } from "lucide-react";
import { CompanionShell } from "@/components/CompanionShell";
import { ChatThread } from "@/components/companion/ChatThread";
import { useHeroImage } from "@/lib/useHeroImage";
import { useAuth } from "@/contexts/auth";
import { listProjectsFull } from "@/lib/xcamp-api";
import { useCompanionSession } from "@/lib/useCompanionSession";
import type { ProjectFull } from "@/types/xcamp";

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

  // ── Companion session (persistence) ────────────────────────────────────────
  const session = useCompanionSession(authUser);

  // ── Step state (drives what the controller dispatches next) ────────────────
  const [step, setStep] = useState<ConvStep>("welcome");
  const [activeProject, setActiveProject] = useState<ProjectFull | null>(null);
  // Track which component message ids correspond to each step's grid/cards
  const gridMsgIdRef = useRef<string | null>(null);

  // ── TTS toggle (inert — wired in CC-2) ────────────────────────────────────
  const [ttsEnabled, setTtsEnabled] = useState(false);

  // ── Background image ───────────────────────────────────────────────────────
  // Fix 1: seed is just "companion" — images are in Hero/ root, not subfolder
  const projectBgUrl =
    step === "inside-project" && activeProject?.feature_image
      ? activeProject.feature_image
      : null;
  // Fix 3: canReload always passed through (no && !projectBgUrl gating)
  const { url: heroBgUrl, reload: reloadHero, canReload } = useHeroImage("companion");
  const bgUrl = projectBgUrl ?? heroBgUrl;

  // ── Projects query — Fix 2: pass authUser directly (has tenantId) ──────────
  const { data: projects = [] } = useQuery({
    queryKey: ["projects-full", authUser?.centralId],
    queryFn: () => listProjectsFull(authUser!),
    enabled: !!authUser,
  });

  // ── Free-input state ───────────────────────────────────────────────────────
  const [draft, setDraft] = useState("");

  // ── Conversation controller: welcome dispatch on first load ───────────────
  // Only fires once per session (when messages are empty and loading is done)
  const welcomeFiredRef = useRef(false);
  useEffect(() => {
    if (session.loading || welcomeFiredRef.current) return;
    if (session.messages.length > 0) {
      // Reconstruct step from persisted messages
      welcomeFiredRef.current = true;
      return;
    }
    welcomeFiredRef.current = true;

    async function dispatchWelcome() {
      await session.appendChiMessage(
        "Hello! Let's make the most of today. What would you like to work on?",
      );
      await session.appendChiMessage("Let's jump into a project.");
      const gridId = await session.appendComponentMessage("project-grid");
      gridMsgIdRef.current = gridId;
      setStep("project-select");
    }

    void dispatchWelcome();
  }, [session.loading, session.messages.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Project selection handler ─────────────────────────────────────────────
  const handleProjectSelect = useCallback(
    async (project: ProjectFull) => {
      setActiveProject(project);
      // Resolve (grey out) the grid component
      if (gridMsgIdRef.current) session.resolveComponent(gridMsgIdRef.current);
      // Append user selection + Chi response
      await session.appendUserMessage(project.name);
      await session.appendChiMessage(
        `Here's what I suggest you focus on today.`,
      );
      await session.appendComponentMessage("action-cards-stub");
      setStep("inside-project");
    },
    [session],
  );

  // ── Project branching: 0 projects → backcaster, 1 → auto-select ──────────
  // Applied after projects load if we're in project-select and have no grid yet
  const branchFiredRef = useRef(false);
  useEffect(() => {
    if (step !== "project-select") return;
    if (session.loading) return;
    if (branchFiredRef.current) return;
    if (projects.length === 0) return; // wait for query

    branchFiredRef.current = true;

    if (projects.length === 1) {
      // Auto-select the single project
      void handleProjectSelect(projects[0]);
    }
    // 2+ projects: grid already rendered, nothing extra to dispatch
    // 0 projects handled by query returning empty — grid shows "No projects yet"
  }, [step, session.loading, projects.length, handleProjectSelect]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── New session handler ───────────────────────────────────────────────────
  const handleNewSession = useCallback(async () => {
    if (!confirm("Start a new conversation?")) return;
    await session.newSession();
    setStep("welcome");
    setActiveProject(null);
    welcomeFiredRef.current = false;
    branchFiredRef.current = false;
    gridMsgIdRef.current = null;
  }, [session]);

  // ── Free-text submit ──────────────────────────────────────────────────────
  const handleSend = useCallback(async () => {
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    await session.appendUserMessage(text);
    await session.appendChiMessage("Got it — I'll help with that soon.");
  }, [draft, session]);

  // ── Shortcut pills ────────────────────────────────────────────────────────
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

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <CompanionShell>
      {/* Layer 0 — full-screen background (DEBUG: hardcoded URL) */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
          background: `url(https://ueebzuleyrnsrxbowdfa.supabase.co/storage/v1/object/public/App%20media/Hero/Nox%20(22).png) center/cover no-repeat`,
          transition: "background-image 0.6s ease",
        }}
      />
      {/* Layer 0.5 — dim scrim */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 1,
          background: "rgba(0,0,0,0.38)",
          pointerEvents: "none",
        }}
      />

      {/* Layer 1 — top chrome */}
      <TopChrome
        ttsEnabled={ttsEnabled}
        onTtsToggle={() => setTtsEnabled((v) => !v)}
        onReload={reloadHero}
        canReload={canReload}
        onNewSession={handleNewSession}
      />

      {/* Layer 2 — glass panel */}
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
          {/* Thread area */}
          <div style={{ flex: 1, overflowY: "auto", padding: "20px 20px 8px" }}>
            <ChatThread
              messages={session.messages}
              projects={projects}
              onProjectSelect={handleProjectSelect}
              onCreateProject={() => {/* CC-3 scope */}}
            />
          </div>

          {/* Input bar */}
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
              placeholder="Ask Chi anything…"
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
              }}
            />
            <button
              onClick={() => void handleSend()}
              disabled={!draft.trim()}
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: "var(--skin-accent-gradient)",
                border: "none",
                color: "white",
                cursor: draft.trim() ? "pointer" : "not-allowed",
                opacity: draft.trim() ? 1 : 0.4,
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

      {/* Layer 3 — shortcut pill bar */}
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
