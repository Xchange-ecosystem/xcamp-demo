import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useActiveProject } from "@/contexts/active-project";
import { useQuery } from "@tanstack/react-query";
import {
  MessageSquarePlus,
  RefreshCw,
  Volume2,
  VolumeX,
  X,
  Mic,
  MicOff,
  Paperclip,
  BookOpen,
  Navigation,
  StickyNote,
  Zap,
} from "lucide-react";
import { CompanionShell } from "@/components/CompanionShell";
import { ChatThread } from "@/components/companion/ChatThread";
import { useHeroImage } from "@/lib/useHeroImage";
import { useAuth } from "@/contexts/auth";
import { createNote, listProjectsFull } from "@/lib/xcamp-api";
import { useCompanionSession } from "@/lib/useCompanionSession";
import { useVox } from "@/hooks/useVox";
import { useVoiceTranscription } from "@/hooks/useVoiceTranscription";
import type { ProjectFull } from "@/types/xcamp";
import type { AICard } from "@xchange/client";
import { executeProposal } from "@xchange/client";
import { toast } from "sonner";
import { EntityPanel } from "@/components/EntityPanel";
import { MentionMenu } from "@/components/MentionMenu";
import type { MentionEntity } from "@/components/MentionMenu";
import { buildContextCardProposal, type EntityType } from "@/components/JournalFlow";
import {
  speak,
  stopSpeaking,
  isMuted,
  setMuted,
  subscribeMuted,
  subscribeTTSError,
  clearTTSError,
  type TTSErrorInfo,
} from "@/lib/ttsClient";
import { getVoiceId, setVoiceId, subscribeVoice, VOICE_OPTIONS } from "@/lib/voicePreference";
import { installAudioUnlock } from "@/lib/audio-unlock";

// ─── CSS custom properties for the glass panel ────────────────────────────────
const GLASS_STYLE: React.CSSProperties = {
  "--glass-blur": "18px",
} as React.CSSProperties;

// Navigation pills shown above the input — simple route shortcuts, no AI.
const NAV_PILLS = [
  { id: "journal",    label: "Journal",          icon: BookOpen,   to: "/journal" },
  { id: "navigator",  label: "Navigate Project",  icon: Navigation, to: "/navigator" },
  { id: "notes",      label: "New Note",          icon: StickyNote, to: "/notes" },
  { id: "backcaster", label: "Start Project",      icon: Zap,        to: "/project-builder" },
] as const;

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
  type: "note" | "task" | "objective";
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

  // ── TTS state (real, backed by ttsClient) ─────────────────────────────────
  const [muted, setMutedState] = useState<boolean>(() => isMuted());
  const [voiceId, setVoiceIdState] = useState<string>(() => getVoiceId());
  const [ttsError, setTtsError] = useState<TTSErrorInfo | null>(null);
  const [dismissedTtsError, setDismissedTtsError] = useState(false);

  // ── Voice transcription (browser SpeechRecognition) ───────────────────────
  const voice = useVoiceTranscription();

  // ── File attachment ────────────────────────────────────────────────────────
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachment, setAttachment] = useState<File | null>(null);

  // ── @-mention state ────────────────────────────────────────────────────────
  const [mentionMenuOpen, setMentionMenuOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionAtIndex, setMentionAtIndex] = useState(0);
  const [mentionedEntities, setMentionedEntities] = useState<MentionEntity[]>([]);

  const projectBgUrl =
    step === "inside-project" && activeProject?.feature_image
      ? activeProject.feature_image
      : null;
  const { url: heroBgUrl, reload: reloadHero, canReload } = useHeroImage();
  const bgUrl = projectBgUrl ?? heroBgUrl;

  // Apply background image directly on <html>
  useEffect(() => {
    if (!bgUrl) return;
    document.documentElement.style.cssText += `; background-image: url("${bgUrl}"); background-size: cover; background-position: center; background-repeat: no-repeat; background-attachment: fixed;`;
    return () => {
      document.documentElement.style.backgroundImage = "";
      document.documentElement.style.backgroundSize = "";
      document.documentElement.style.backgroundPosition = "";
      document.documentElement.style.backgroundRepeat = "";
      document.documentElement.style.backgroundAttachment = "";
    };
  }, [bgUrl]);

  // ── TTS setup effects ──────────────────────────────────────────────────────
  useEffect(() => { installAudioUnlock(); }, []);
  useEffect(() => subscribeMuted((v) => setMutedState(v)), []);
  useEffect(() => subscribeVoice((id) => setVoiceIdState(id)), []);
  useEffect(() => subscribeTTSError((err) => {
    setTtsError(err);
    if (err) setDismissedTtsError(false);
  }), []);
  // Stop TTS when navigating away
  useEffect(() => () => { stopSpeaking(); }, []);

  // ── Wire voice transcript into draft ───────────────────────────────────────
  const [draft, setDraft] = useState("");
  useEffect(() => {
    if (voice.transcript) setDraft(voice.transcript);
  }, [voice.transcript]);

  const [typingMessageId, setTypingMessageId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [panelTarget, setPanelTarget] = useState<PanelTarget | null>(null);
  const [dismissedCardIds, setDismissedCardIds] = useState<Set<string>>(new Set());

  const { data: projects = [] } = useQuery({
    queryKey: ["projects-full", authUser?.centralId],
    queryFn: () => listProjectsFull(authUser!),
    enabled: !!authUser,
  });

  const vox = useVox();
  const altitude = 1 as const;

  const waitForTyping = (text: string) =>
    new Promise<void>((resolve) => setTimeout(resolve, text.length * 38));

  const isNewDay = (dateStr: string) => {
    const sessionDate = new Date(dateStr).toDateString();
    const today = new Date().toDateString();
    return sessionDate !== today;
  };

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
    if (projects.length === 0) return;

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
      if (session.conversationProjectId && !activeProjectId) {
        const project = projects.find((p) => p.id === session.conversationProjectId);
        if (project) {
          projectRestoredRef.current = true;
          setActiveProjectId(session.conversationProjectId);
          setActiveProject(project);
          setStep("inside-project");
        }
      }
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
      speak(MSG1);
      setTypingMessageId(id1);
      await waitForTyping(MSG1);
      setTypingMessageId(null);

      const MSG2 =
        projects.length > 0
          ? `You have ${projects.length} ${projects.length === 1 ? "project" : "projects"} — let's jump in.`
          : "Let's start by jumping into a project.";
      const id2 = await session.appendChiMessage(MSG2);
      speak(MSG2);
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
      stopSpeaking();
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

      if (project.description) {
        const desc = project.description.trim();
        const sentences = desc.match(/[^.!?\n][^.!?\n]*[.!?]?/g) ?? [desc];
        const summary = sentences.slice(0, 2).join(" ").trim().slice(0, 240);
        const descId = await session.appendChiMessage(summary);
        speak(summary);
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
      speak(reply);
      setTypingMessageId(chiId);
      await waitForTyping(reply);
      setTypingMessageId(null);

      if (cards.length > 0) {
        await session.appendComponentMessage("action-cards", { cards } as Record<string, unknown>);
      }
    },
    [session, vox, authUser, altitude, setActiveProjectId], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const handleProjectDeselect = useCallback(async () => {
    stopSpeaking();
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
    speak(msg);
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

  useEffect(() => {
    if (!activeProjectId) return;
    if (activeProject?.id === activeProjectId) return;
    if (session.loading) return;
    if (session.messages.length > 0 && !welcomeFiredRef.current) return;
    if (projectRestoredRef.current) {
      projectRestoredRef.current = false;
      return;
    }
    if (switchingProjectRef.current) return;
    const project = projects.find((p) => p.id === activeProjectId);
    if (!project) return;
    if (session.messages.length > 0) {
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
    void navigate({ to: "/project-builder" });
  }, [navigate]);

  const handleCardConfirm = useCallback(async (card: AICard, selectedType: EntityType) => {
    if (!card.proposal) return;

    if (card.proposal.tool === "navigate") {
      const payload = card.proposal.payload as { url?: string };
      if (payload.url) void navigate({ to: payload.url });
      setDismissedCardIds((prev) => new Set([...prev, card.id]));
      return;
    }

    if (selectedType === "objective") {
      const modifiedProposal = buildContextCardProposal(card, selectedType) ?? card.proposal;
      try {
        const token = await supabase.auth.getSession().then((r) => r.data.session?.access_token ?? "");
        const result = await executeProposal(
          modifiedProposal,
          () => Promise.resolve(token || null),
          (import.meta.env.VITE_BACKEND_URL as string) ?? "",
        );
        if (result.ok) {
          const rawPayload = (modifiedProposal as unknown as { payload: Record<string, unknown> }).payload;
          const payloadTitle = typeof rawPayload?.title === "string" ? rawPayload.title : card.title;
          const objId = typeof rawPayload?.objective_id === "string" ? rawPayload.objective_id : undefined;
          setDismissedCardIds((prev) => new Set([...prev, card.id]));
          setPanelTarget({ type: "objective", id: result.committed_id ?? objId ?? "", prefillText: card.body, initialTitle: payloadTitle });
          toast.success("Done — card applied.");
        } else {
          toast.error(result.error ?? "Could not apply card.");
        }
      } catch (err) {
        console.error("[Chi] objective proposal failed:", err);
        toast.error("Something went wrong applying the card.");
      }
      return;
    }

    const noteType = selectedType === "task" ? "task" : selectedType === "resource" ? "reference" : "note";
    const rawProposal = card.proposal as unknown as { payload?: Record<string, unknown> };
    const title = typeof rawProposal?.payload?.title === "string" ? rawProposal.payload.title : (card.title ?? "Untitled");

    try {
      const note = await createNote(authUser!, {
        title,
        bodyHtml: "",
        noteType,
        projectId: null,
        objectiveIds: [],
        tags: [],
      });
      const panelType: PanelTarget["type"] = selectedType === "task" ? "task" : "note";
      setDismissedCardIds((prev) => new Set([...prev, card.id]));
      setPanelTarget({ type: panelType, id: note.id, prefillText: card.body, initialTitle: title });
      toast.success("Done — card applied.");
    } catch (err) {
      console.error("[Chi] createNote failed:", err);
      toast.error((err as Error).message ?? "Could not create note.");
    }
  }, [authUser, navigate]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCardDismiss = useCallback((card: AICard) => {
    setDismissedCardIds((prev) => new Set([...prev, card.id]));
  }, []);

  const handleNewSession = useCallback(async () => {
    stopSpeaking();
    welcomeFiredRef.current = false;
    branchFiredRef.current = false;
    gridMsgIdRef.current = null;
    setActiveProject(null);
    setActiveProjectId(null);
    await session.newSession();
    setStep("welcome");
  }, [session, setActiveProjectId]);

  // ── @-mention selection ────────────────────────────────────────────────────
  const handleMentionSelect = useCallback((entity: MentionEntity) => {
    setDraft(prev => {
      const beforeAt = prev.slice(0, mentionAtIndex);
      const afterQuery = prev.slice(mentionAtIndex + 1 + mentionQuery.length);
      return beforeAt + afterQuery;
    });
    setMentionMenuOpen(false);
    setMentionQuery("");
    setMentionedEntities(prev => {
      if (prev.some(e => e.id === entity.id)) return prev;
      return [...prev, entity];
    });
  }, [mentionAtIndex, mentionQuery]);

  const handleSend = useCallback(async () => {
    const text = draft.trim();
    if (!text || isLoading) return;
    stopSpeaking();
    setDraft("");
    voice.setTranscript("");
    setAttachment(null);
    const referencedIds = mentionedEntities.map(e => e.id);
    setMentionedEntities([]);
    setMentionMenuOpen(false);
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
        ...(referencedIds.length > 0 ? { referenced_entity_ids: referencedIds } : {}),
      });
      reply = res.reply_markdown;
      cards = res.cards ?? [];
    } catch (err) {
      console.error("[Chi] Vox call failed:", err);
    } finally {
      setIsLoading(false);
    }

    const chiId = await session.appendChiMessage(reply);
    speak(reply);
    setTypingMessageId(chiId);
    await waitForTyping(reply);
    setTypingMessageId(null);

    if (cards.length > 0) {
      await session.appendComponentMessage("action-cards", { cards } as Record<string, unknown>);
    }
  }, [draft, isLoading, session, vox, activeProject, authUser, altitude, voice, mentionedEntities]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
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

        <TopChrome
          muted={muted}
          voiceId={voiceId}
          onMuteToggle={() => setMuted(!muted)}
          onVoiceChange={(id) => { stopSpeaking(); setVoiceId(id); }}
          onReload={reloadHero}
          canReload={canReload}
          onNewSession={handleNewSession}
          activeProject={activeProject}
          onDeselectProject={handleProjectDeselect}
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
            {/* Chat thread scroll area */}
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

            {/* TTS error banner */}
            {ttsError && !dismissedTtsError && !muted && (
              <div
                role="alert"
                style={{
                  margin: "0 14px",
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: "1px solid rgba(239,68,68,0.4)",
                  background: "rgba(239,68,68,0.1)",
                  fontSize: 12,
                  color: "rgba(239,68,68,0.9)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                }}
              >
                <span>
                  {ttsError.kind === "missing_key"
                    ? "Voice off — ElevenLabs key not configured"
                    : ttsError.kind === "network_error"
                    ? "Voice off — TTS function unreachable"
                    : `Voice error (${ttsError.status ?? "unknown"})`}
                </span>
                <button
                  onClick={() => { setDismissedTtsError(true); clearTTSError(); }}
                  style={{ background: "transparent", border: "none", cursor: "pointer", color: "inherit", fontSize: 14, padding: "0 2px" }}
                  aria-label="Dismiss"
                >
                  ×
                </button>
              </div>
            )}

            {/* Input section — pill bar + action row */}
            <div
              style={{
                flexShrink: 0,
                borderTop: "1px solid var(--glass-divider)",
                padding: "8px 14px 12px",
              }}
            >
              {/* Nav pill bar */}
              <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
                {NAV_PILLS.map((pill) => (
                  <button
                    key={pill.id}
                    onClick={() => void navigate({ to: pill.to })}
                    style={{
                      display: "flex", alignItems: "center", gap: 4,
                      padding: "4px 10px", borderRadius: "var(--xr-pill, 999px)",
                      border: "1px solid var(--glass-border-color)",
                      background: "var(--glass-bubble-bg)", color: "var(--glass-text)",
                      cursor: "pointer", fontSize: 12, fontWeight: 500, whiteSpace: "nowrap",
                    }}
                  >
                    <pill.icon size={11} />
                    {pill.label}
                  </button>
                ))}
              </div>

              {/* Input row wrapper — relative so MentionMenu can float above */}
              <div style={{ position: "relative" }}>
                {/* @-mention floating menu */}
                <MentionMenu
                  isOpen={mentionMenuOpen}
                  query={mentionQuery}
                  projectId={activeProject?.id}
                  onSelect={handleMentionSelect}
                  onClose={() => setMentionMenuOpen(false)}
                />

                {/* Input row */}
                <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
                  <div style={{ display: "flex", gap: 2, paddingBottom: 4, flexShrink: 0 }}>
                    <InputActionButton title="Attach file" onClick={() => fileInputRef.current?.click()}><Paperclip size={13} /></InputActionButton>
                    <InputActionButton title={!voice.supported ? "Voice input not supported in this browser" : voice.isListening ? "Stop recording" : "Voice input"} onClick={() => (voice.isListening ? voice.stop() : voice.start())} disabled={!voice.supported} active={voice.isListening}>{voice.isListening ? <MicOff size={13} /> : <Mic size={13} />}</InputActionButton>
                  </div>
                  <input ref={fileInputRef} type="file" style={{ display: "none" }} onChange={(e) => { const file = e.target.files?.[0] ?? null; setAttachment(file); if (file) toast.info(`File selected: ${file.name} — attachment will be sent once backend support lands.`); e.target.value = ""; }} />
                  <textarea
                    value={draft}
                    onChange={(e) => {
                      const val = e.target.value;
                      setDraft(val);
                      // Detect @-mention trigger
                      const cursor = e.target.selectionStart ?? val.length;
                      const beforeCursor = val.slice(0, cursor);
                      const atIdx = beforeCursor.lastIndexOf('@');
                      if (atIdx !== -1) {
                        const afterAt = beforeCursor.slice(atIdx + 1);
                        if (!afterAt.includes(' ') && !afterAt.includes('\n')) {
                          setMentionAtIndex(atIdx);
                          setMentionQuery(afterAt);
                          setMentionMenuOpen(true);
                        } else {
                          setMentionMenuOpen(false);
                        }
                      } else {
                        setMentionMenuOpen(false);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void handleSend(); }
                      if (e.key === "Escape" && mentionMenuOpen) { e.preventDefault(); setMentionMenuOpen(false); }
                    }}
                    rows={2}
                    placeholder={voice.isListening ? "Listening…" : isLoading ? "Chi is thinking…" : "Ask Chi anything… (type @ to reference an entity)"}
                    disabled={isLoading}
                    style={{ flex: 1, resize: "none", background: "var(--glass-input-bg)", border: voice.isListening ? "1px solid var(--skin-accent, #4de0c1)" : "1px solid var(--glass-input-border)", borderRadius: 10, color: "var(--glass-text)", fontSize: 14, padding: "8px 12px", outline: "none", fontFamily: "inherit", opacity: isLoading ? 0.5 : 1, transition: "border-color 0.2s" }}
                  />
                  <button onClick={() => void handleSend()} disabled={!draft.trim() || isLoading} style={{ width: 36, height: 36, borderRadius: 10, background: "var(--skin-accent-gradient)", border: "none", color: "white", cursor: draft.trim() && !isLoading ? "pointer" : "not-allowed", opacity: draft.trim() && !isLoading ? 1 : 0.4, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>&#x27a4;</button>
                </div>

                {/* Mentioned entity chips */}
                {mentionedEntities.length > 0 && (
                  <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {mentionedEntities.map(entity => (
                      <div
                        key={entity.id}
                        style={{
                          display: "flex", alignItems: "center", gap: 4,
                          padding: "2px 6px 2px 10px", borderRadius: 999,
                          background: "var(--glass-bubble-bg)",
                          border: "1px solid var(--skin-accent, #4de0c1)",
                          fontSize: 11, color: "var(--glass-text)",
                        }}
                      >
                        <span style={{ opacity: 0.6, fontSize: 10, textTransform: "capitalize", marginRight: 2 }}>{entity.type}</span>
                        <span style={{ maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{entity.title}</span>
                        <button
                          onClick={() => setMentionedEntities(prev => prev.filter(e => e.id !== entity.id))}
                          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--glass-text)", fontSize: 14, padding: "0 2px", lineHeight: 1, marginLeft: 2 }}
                          aria-label={`Remove ${entity.title} from context`}
                        >×</button>
                      </div>
                    ))}
                  </div>
                )}

                {attachment && (
                  <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--glass-text-soft)" }}>
                    <Paperclip size={10} />
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 220 }}>{attachment.name}</span>
                    <button onClick={() => setAttachment(null)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "inherit", fontSize: 13, padding: 0 }} aria-label="Remove attachment">×</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </CompanionShell>

      {panelTarget && (
        <EntityPanel open onClose={() => setPanelTarget(null)} type={panelTarget.type} id={panelTarget.id} objectiveId={panelTarget.objectiveId} prefillText={panelTarget.prefillText} initialTitle={panelTarget.initialTitle} user={authUser ?? undefined} />
      )}
    </>
  );
}

// ─── TopChrome ─────────────────────────────────────────────────────────────────
function TopChrome({
  muted,
  voiceId,
  onMuteToggle,
  onVoiceChange,
  onReload,
  canReload,
  onNewSession,
  activeProject,
  onDeselectProject,
}: {
  muted: boolean;
  voiceId: string;
  onMuteToggle: () => void;
  onVoiceChange: (id: string) => void;
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
        left: 0,
        right: 0,
        zIndex: 20,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "10px 18px",
        background: "rgba(0,0,0,0.18)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ color: "rgba(255,255,255,0.9)", fontWeight: 700, fontSize: 15, letterSpacing: "0.01em" }}>
          Chi
        </span>
        {activeProject && (
          <div
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "3px 10px 3px 8px", borderRadius: 999,
              background: "rgba(255,255,255,0.1)",
              border: "1px solid rgba(255,255,255,0.15)",
            }}
          >
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.85)", fontWeight: 500, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {activeProject.name}
            </span>
            <button
              onClick={onDeselectProject}
              style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.55)", fontSize: 14, padding: "0 2px", display: "flex", alignItems: "center" }}
              aria-label="Unlink project"
            >
              <X size={12} />
            </button>
          </div>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <ChromeButton title="New session" onClick={onNewSession}><MessageSquarePlus size={15} /></ChromeButton>
        {canReload && (
          <ChromeButton title="New background" onClick={onReload}><RefreshCw size={15} /></ChromeButton>
        )}
        <ChromeButton title={muted ? "Unmute voice" : "Mute voice"} onClick={onMuteToggle} active={!muted}>
          {muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
        </ChromeButton>
        <select
          value={voiceId}
          onChange={(e) => onVoiceChange(e.target.value)}
          style={{
            background: "rgba(255,255,255,0.1)",
            border: "1px solid rgba(255,255,255,0.15)",
            borderRadius: 8,
            color: "rgba(255,255,255,0.8)",
            fontSize: 11,
            padding: "4px 6px",
            cursor: "pointer",
            maxWidth: 100,
          }}
          aria-label="Voice selection"
        >
          {VOICE_OPTIONS.map((v) => (
            <option key={v.id} value={v.id} style={{ background: "#1a1a2e" }}>
              {v.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function ChromeButton({
  children,
  onClick,
  title,
  active = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title?: string;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        width: 32,
        height: 32,
        borderRadius: 8,
        background: active ? "rgba(77,224,193,0.2)" : "rgba(255,255,255,0.1)",
        border: active ? "1px solid rgba(77,224,193,0.4)" : "1px solid rgba(255,255,255,0.15)",
        color: active ? "rgba(77,224,193,0.9)" : "rgba(255,255,255,0.7)",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {children}
    </button>
  );
}

function InputActionButton({
  children,
  onClick,
  title,
  active = false,
  disabled = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title?: string;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      disabled={disabled}
      style={{
        width: 28,
        height: 28,
        borderRadius: 7,
        background: active ? "rgba(77,224,193,0.15)" : "transparent",
        border: active ? "1px solid rgba(77,224,193,0.35)" : "1px solid var(--glass-border-color)",
        color: active ? "rgba(77,224,193,0.9)" : "var(--glass-text)",
        cursor: disabled ? "not-allowed" : "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        opacity: disabled ? 0.4 : 1,
      }}
    >
      {children}
    </button>
  );
}
