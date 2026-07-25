import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useActiveProject } from "@/contexts/active-project";
import { useQuery } from "@tanstack/react-query";
import { MessageSquarePlus, RefreshCw, Volume2, VolumeX, X } from "lucide-react";
import { CompanionShell } from "@/components/CompanionShell";
import { ChatThread } from "@/components/companion/ChatThread";
import { useHeroImage } from "@/lib/useHeroImage";
import { useAuth } from "@/contexts/auth";
import { createNote, listProjectsFull } from "@/lib/xcamp-api";
import { useCompanionSession } from "@/lib/useCompanionSession";
import { useVox } from "@/hooks/useVox";
import type { ProjectFull } from "@/types/xcamp";
import type { AICard } from "@xchange/client";
import { executeProposal } from "@xchange/client";
import { toast } from "sonner";
import { EntityPanel } from "@/components/EntityPanel";
import { buildContextCardProposal, type EntityType } from "@/components/JournalFlow";

// ─── CSS custom properties for the glass panel ────────────────────────────────
// Only --glass-blur is set inline; all other glass tokens are defined in
// styles.css (:root for light, .dark for dark) so they respond to the theme.
const GLASS_STYLE: React.CSSProperties = {
  "--glass-blur": "18px",
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

interface PanelTarget {
  type: 'note' | 'task' | 'objective';
  id: string;
  objectiveId?: string;
  prefillText?: string;
  initialTitle?: string;
}

function CompanionHomePage() {
  const { user: authUser } = useAuth();
  const { activeProjectId, setActiveProjectId } = useActiveProject();
  const navigate = useNavigate();

  const session = useCompanionSession(authUser);

  const [step, setStep] = useState<ConvStep>("welcome");
  const [activeProject, setActiveProject] = useState<ProjectFull | null>(null);
  const gridMsgIdRef = useRef<string | null>(null);

  const [ttsEnabled, setTtsEnabled] = useState(false);

  const projectBgUrl =
    step === "inside-project" && activeProject?.feature_image
      ? activeProject.feature_image
      : null;
  // Item 3: no seed → Math.random() selection on each fresh mount (random hero per load)
  const { url: heroBgUrl, reload: reloadHero, canReload } = useHeroImage();
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
  const [panelTarget, setPanelTarget] = useState<PanelTarget | null>(null);
  const [dismissedCardIds, setDismissedCardIds] = useState<Set<string>>(new Set());

  // Resolves after the typewriter would finish for a given text at 38ms/char.
  const waitForTyping = (text: string) =>
    new Promise<void>((resolve) => setTimeout(resolve, text.length * 38));

  const isNewDay = (dateStr: string) => {
    const sessionDate = new Date(dateStr).toDateString();
    const today = new Date().toDateString();
    return sessionDate !== today;
  };

  // Close the session when the user logs out so the next login starts fresh.
  const prevAuthUserRef = useRef(authUser);
  useEffect(() => {
    const prev = prevAuthUserRef.current;
    prevAuthUserRef.current = authUser;
    if (prev !== null && authUser === null) {
      void session.closeSession();
    }
  }, [authUser]); // eslint-disable-line react-hooks/exhaustive-deps

  const projectRestoredRef = useRef(false);
  const welcomeFiredRef = useRef(false);
  const prevActiveProjectIdRef = useRef<string | null>(activeProjectId);
  useEffect(() => {
    if (session.loading || welcomeFiredRef.current) return;
    if (projects.length === 0) return; // wait for projects to load

    // If the loaded conversation is from a previous day, start fresh
    if (
      session.conversationId &&
      session.conversationCreatedAt &&
      session.messages.length > 0 &&
      isNewDay(session.conversationCreatedAt)
    ) {
      void session.newSession().then(() => {
        setActiveProjectId(null);
        setStep("welcome");
        setActiveProject(null);
        welcomeFiredRef.current = false;
        branchFiredRef.current = false;
        gridMsgIdRef.current = null;
      });
      return;
    }

    if (session.messages.length > 0) {
      // Restore project from previous session if available
      if (session.conversationProjectId && !activeProjectId) {
        const project = projects.find((p) => p.id === session.conversationProjectId);
        if (project) {
          projectRestoredRef.current = true;
          setActiveProjectId(session.conversationProjectId);
          setActiveProject(project);
          setStep("inside-project");
        }
      }
      // Mark done only after project restore attempt — projects are loaded at this point
      welcomeFiredRef.current = true;
      return;
    }
    welcomeFiredRef.current = true;

    setActiveProjectId(null);

    async function dispatchWelcome() {
      const firstName = authUser?.displayName?.split(" ")?.[0] ?? "there";
      const hour = new Date().getHours();
      const timeGreeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

      const MSG1 = `${timeGreeting}, ${firstName}! Let's make the most of today. What would you like to work on?`;
      const id1 = await session.appendChiMessage(MSG1);
      setTypingMessageId(id1);
      await waitForTyping(MSG1);
      setTypingMessageId(null);

      const MSG2 =
        projects.length > 0
          ? `You have ${projects.length} ${projects.length === 1 ? "project" : "projects"} — let's jump in.`
          : "Let's start by jumping into a project.";
      const id2 = await session.appendChiMessage(MSG2);
      setTypingMessageId(id2);
      await waitForTyping(MSG2);
      setTypingMessageId(null);

      const gridId = await session.appendComponentMessage("project-grid");
      gridMsgIdRef.current = gridId;
      setStep("project-select");
    }

    void dispatchWelcome();
  }, [session.loading, session.messages.length, session.conversationCreatedAt, session.conversationProjectId, projects.length]); // eslint-disable-line react-hooks/exhaustive-deps

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

      // Show project description as an immediate 2-line motivational summary (no AI call needed)
      if (project.description) {
        const desc = project.description.trim();
        const sentences = desc.match(/[^.!?\n][^.!?\n]*[.!?]?/g) ?? [desc];
        const summary = sentences.slice(0, 2).join(" ").trim().slice(0, 240);
        const descId = await session.appendChiMessage(summary);
        setTypingMessageId(descId);
        await waitForTyping(summary);
        setTypingMessageId(null);
      }

      let reply = "Here's what I suggest you focus on today.";
      let cards: AICard[] = [];

      setIsLoading(true);
      try {
        const res = await vox.call({
          message: `I just selected the project "${project.name}". Based on the current objectives and notes, suggest 2-3 specific action cards I should work on right now. Each card should be a concrete next step.`,
          project_id: project.id,
          objective_id: "",
          tenant_id: authUser!.tenantId,
          altitude,
          aiPersona: "guide",
          context_scope: "project",
        });
        reply = res.reply_markdown || reply;
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

  // Item 1: Explicit deselect — clears localStorage AND nulls the Supabase
  // conversation project_id so the project is NOT restored on hard reload.
  const handleProjectDeselect = useCallback(async () => {
    setActiveProject(null);
    setActiveProjectId(null);

    if (session.conversationId) {
      supabase
        .from("jarvix_conversations")
        .update({ project_id: null })
        .eq("id", session.conversationId)
        .then();
    }

    const msg = "Project unlinked — you're in general chat mode. Pick a project from the grid, or just ask me anything.";
    const msgId = await session.appendChiMessage(msg);
    setTypingMessageId(msgId);
    await waitForTyping(msg);
    setTypingMessageId(null);

    const gridId = await session.appendComponentMessage("project-grid");
    gridMsgIdRef.current = gridId;
    setStep("project-select");
  }, [session, setActiveProjectId]); // eslint-disable-line react-hooks/exhaustive-deps

  const branchFiredRef = useRef(false);
  const switchingProjectRef = useRef(false);
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

  // Sync sidebar project selection into the companion flow.
  // When there are existing messages (mid-conversation project change via sidebar),
  // start a fresh session so no duplicate project-grid appears in the chat.
  useEffect(() => {
    if (!activeProjectId) return;
    if (activeProject?.id === activeProjectId) return;
    if (session.loading) return;
    // Don't fire during initial session restore (returning session with messages
    // already loaded — welcomeFiredRef not yet set means we're still initializing)
    if (session.messages.length > 0 && !welcomeFiredRef.current) return;
    // Skip if the project was just restored from session — not a user selection
    if (projectRestoredRef.current) {
      projectRestoredRef.current = false;
      return;
    }
    // Prevent double-fire while newSession() is in flight
    if (switchingProjectRef.current) return;
    const project = projects.find((p) => p.id === activeProjectId);
    if (!project) return;
    if (session.messages.length > 0) {
      // Mid-conversation sidebar change: start a new session for the new project
      switchingProjectRef.current = true;
      void session.newSession().then(() => {
        switchingProjectRef.current = false;
        gridMsgIdRef.current = null;
        branchFiredRef.current = false;
        void handleProjectSelect(project, false);
      });
    } else {
      void handleProjectSelect(project, false);
    }
  }, [activeProjectId, session.loading, session.messages.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sidebar "General" deselect: when activeProjectId is cleared externally, mirror
  // the clear into companion UI state and persist project_id=null to Supabase so the
  // deselect survives a hard reload (prevents the restore path from re-activating it).
  useEffect(() => {
    const prev = prevActiveProjectIdRef.current;
    prevActiveProjectIdRef.current = activeProjectId;

    if (prev !== null && activeProjectId === null) {
      setActiveProject(null);
      if (session.conversationId) {
        supabase
          .from("jarvix_conversations")
          .update({ project_id: null })
          .eq("id", session.conversationId)
          .then();
      }
    }
  }, [activeProjectId, session.conversationId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCreateProject = useCallback(() => {
    void navigate({ to: '/project-builder' });
  }, [navigate]);

  const handleCardConfirm = useCallback(async (card: AICard, selectedType: EntityType) => {
    if (!card.proposal) return;

    // Navigate proposals are purely client-side — route without creating an entity
    if (card.proposal.tool === 'navigate') {
      const payload = card.proposal.payload as { url?: string };
      if (payload.url) void navigate({ to: payload.url });
      setDismissedCardIds((prev) => new Set([...prev, card.id]));
      return;
    }

    if (selectedType === 'objective') {
      // Objective creation — existing proposal/execute path, untouched
      const modifiedProposal = buildContextCardProposal(card, selectedType) ?? card.proposal;
      try {
        const token = await supabase.auth.getSession().then(r => r.data.session?.access_token ?? '');
        const result = await executeProposal(
          modifiedProposal,
          () => Promise.resolve(token || null),
          (import.meta.env.VITE_BACKEND_URL as string) ?? '',
        );
        if (result.ok) {
          const rawPayload = (modifiedProposal as unknown as { payload: Record<string, unknown> }).payload;
          const payloadTitle = typeof rawPayload?.title === 'string' ? rawPayload.title : card.title;
          const objId = typeof rawPayload?.objective_id === 'string' ? rawPayload.objective_id : undefined;
          setDismissedCardIds((prev) => new Set([...prev, card.id]));
          setPanelTarget({ type: 'objective', id: result.committed_id ?? objId ?? '', prefillText: card.body, initialTitle: payloadTitle });
          toast.success('Done — card applied.');
        } else {
          toast.error(result.error ?? 'Could not apply card.');
        }
      } catch (err) {
        console.error('[Chi] objective proposal failed:', err);
        toast.error('Something went wrong applying the card.');
      }
      return;
    }

    // Note, Task, Resource — createNote() directly; no objective required
    const noteType = selectedType === 'task' ? 'task' : selectedType === 'resource' ? 'reference' : 'note';
    const rawProposal = card.proposal as unknown as { payload?: Record<string, unknown> };
    const title = typeof rawProposal?.payload?.title === 'string' ? rawProposal.payload.title : (card.title ?? 'Untitled');

    try {
      const note = await createNote(authUser!, {
        title,
        bodyHtml: '',
        noteType,
        projectId: null,
        objectiveIds: [],
        tags: [],
      });
      const panelType: PanelTarget['type'] = selectedType === 'task' ? 'task' : 'note';
      setDismissedCardIds((prev) => new Set([...prev, card.id]));
      setPanelTarget({ type: panelType, id: note.id, prefillText: card.body, initialTitle: title });
      toast.success('Done — card applied.');
    } catch (err) {
      console.error('[Chi] createNote failed:', err);
      toast.error((err as Error).message ?? 'Could not create note.');
    }
  }, [authUser, navigate]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCardDismiss = useCallback((card: AICard) => {
    setDismissedCardIds((prev) => new Set([...prev, card.id]));
  }, []);

  const handleNewSession = useCallback(async () => {
    await session.newSession();
    setStep("welcome");
    setActiveProject(null);
    setActiveProjectId(null);
    welcomeFiredRef.current = false;
    branchFiredRef.current = false;
    gridMsgIdRef.current = null;
  }, [session, setActiveProjectId]);

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
        project_id: activeProject?.id || undefined,
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
      const labelMap: Record<string, string> = {
        note: "Quick note",
        objective: "Set objective",
        reflect: "Reflect",
        plan: "Plan today",
      };
      const userLabel = labelMap[id] ?? id;
      await session.appendUserMessage(userLabel);

      if (id === "note" || id === "objective") {
        await session.appendChiMessage("Got it — I'll help with that soon.");
        return;
      }

      const voxMessage =
        id === "reflect"
          ? "Let's reflect on my recent progress. What have I accomplished, and where should I direct my energy next?"
          : "Help me plan the rest of my day based on my current goals and commitments.";

      let reply = "Got it — I'll help with that soon.";
      let cards: AICard[] = [];
      setIsLoading(true);
      try {
        const res = await vox.call({
          message: voxMessage,
          project_id: activeProject?.id || undefined,
          objective_id: "",
          tenant_id: authUser!.tenantId,
          altitude,
          aiPersona: "guide",
        });
        reply = res.reply_markdown;
        cards = res.cards ?? [];
      } catch (err) {
        console.error("[Chi] Shortcut vox call failed:", err);
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
    [session, vox, activeProject, authUser, altitude], // eslint-disable-line react-hooks/exhaustive-deps
  );

  return (
    <>
      <CompanionShell>
        {/* Scrim — sits above the <html> background image; always dark so it
            works regardless of light/dark mode (the photo is behind it). */}
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1,
            background: "rgba(0,0,0,0.38)",
            pointerEvents: "none",
          }}
        />

        {/* Top chrome — Item 4: icons use --skin-ink-soft (theme-aware skin token) */}
        <TopChrome
          ttsEnabled={ttsEnabled}
          onTtsToggle={() => setTtsEnabled((v) => !v)}
          onReload={reloadHero}
          canReload={canReload}
          onNewSession={handleNewSession}
          activeProject={activeProject}
          onDeselectProject={handleProjectDeselect}
        />

        {/* Glass panel — light/dark appearance driven by --glass-* tokens in styles.css */}
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 10,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            paddingTop: "2vh",
            paddingBottom: "2vh",
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              ...GLASS_STYLE,
              pointerEvents: "auto",
              width: "min(580px, 92vw)",
              height: "min(92vh, 860px)",
              display: "flex",
              flexDirection: "column",
              borderRadius: 20,
              background: "var(--glass-bg)",
              border: "1px solid var(--glass-border-color)",
              boxShadow: "var(--glass-shadow)",
              backdropFilter: "blur(var(--glass-blur, 18px))",
              WebkitBackdropFilter: "blur(var(--glass-blur, 18px))",
              color: "var(--glass-text)",
              overflow: "hidden",
            }}
          >
            <div style={{ flex: 1, overflowY: "auto", padding: "20px 20px 8px" }}>
              <ChatThread
                messages={session.messages}
                projects={projects}
                onProjectSelect={handleProjectSelect}
                onCreateProject={handleCreateProject}
                typingMessageId={typingMessageId ?? undefined}
                isLoading={isLoading}
                onCardConfirm={handleCardConfirm}
                onCardDismiss={handleCardDismiss}
                hiddenCardIds={dismissedCardIds}
              />
            </div>

            <div
              style={{
                flexShrink: 0,
                borderTop: "1px solid var(--glass-divider)",
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
                  background: "var(--glass-input-bg)",
                  border: "1px solid var(--glass-input-border)",
                  borderRadius: 10,
                  color: "var(--glass-text)",
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
                &#x27a4;
              </button>
            </div>
          </div>
        </div>

        {/* Item 2: ShortcutPillBar hidden — non-functional, visually overlaps the
            input container. Wrapped in display:none to keep handleShortcut and the
            component definition available for future reinstatement. */}
        <div style={{ display: "none" }}>
          <ShortcutPillBar onShortcut={handleShortcut} />
        </div>
      </CompanionShell>

      {panelTarget && (
        <EntityPanel
          open
          onClose={() => setPanelTarget(null)}
          type={panelTarget.type}
          id={panelTarget.id}
          objectiveId={panelTarget.objectiveId}
          prefillText={panelTarget.prefillText}
          initialTitle={panelTarget.initialTitle}
          user={authUser ?? undefined}
        />
      )}
    </>
  );
}

// ─── Top chrome ──────────────────────────────────────────────────────────────
function TopChrome({
  ttsEnabled,
  onTtsToggle,
  onReload,
  canReload,
  onNewSession,
  activeProject,
  onDeselectProject,
}: {
  ttsEnabled: boolean;
  onTtsToggle: () => void;
  onReload: () => void;
  canReload: boolean;
  onNewSession: () => void;
  activeProject: ProjectFull | null;
  onDeselectProject: () => void;
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
      {/* Item 1: Project pill — click × to deselect and return to general-chat mode */}
      {activeProject && (
        <button
          onClick={onDeselectProject}
          title="Return to general mode"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "4px 8px 4px 12px",
            borderRadius: "var(--xr-pill, 999px)",
            background: "var(--glass-chrome-bg)",
            border: "1px solid var(--glass-chrome-border)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            color: "var(--skin-ink-soft)",
            cursor: "pointer",
            fontSize: 12,
            fontWeight: 500,
            maxWidth: 200,
          }}
        >
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {activeProject.name}
          </span>
          <X size={12} style={{ flexShrink: 0 }} />
        </button>
      )}
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
        background: "var(--glass-chrome-bg)",
        border: "1px solid var(--glass-chrome-border)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        // Item 4: --skin-ink-soft adapts with light/dark theme (dark grey in light
        // mode, light grey in dark mode) matching the Batch 6 token convention.
        color: "var(--skin-ink-soft)",
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

// ─── Shortcut pill bar ────────────────────────────────────────────────────────
// Item 2: Component and handler retained for future use; not rendered in JSX.
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
        background: "var(--glass-pill-bg)",
        border: "1px solid var(--glass-pill-border)",
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
            color: "var(--glass-text)",
            background: "var(--glass-bubble-bg)",
          }}
        >
          {pill.label}
        </button>
      ))}
    </div>
  );
}
