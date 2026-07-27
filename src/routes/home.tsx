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
  Plus,
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
import {
  getVoiceId,
  setVoiceId,
  subscribeVoice,
  VOICE_OPTIONS,
  fetchVoices,
  type VoiceOption,
} from "@/lib/voicePreference";
import { installAudioUnlock } from "@/lib/audio-unlock";
import { MentionMenu, type MentionEntity } from "@/components/MentionMenu";

// ─── CSS custom properties for the glass panel ────────────────────────────────
const GLASS_STYLE: React.CSSProperties = {
  "--glass-blur": "18px",
} as React.CSSProperties;

// Navigation pills shown below the glass panel — simple route shortcuts.
const NAV_PILLS = [
  { id: "journal",    label: "My Journal",    icon: BookOpen,   to: "/journal" },
  { id: "notes",      label: "My Notes",      icon: StickyNote, to: "/notes" },
  { id: "navigator",  label: "Navigator",     icon: Navigation, to: "/navigator" },
  { id: "backcaster", label: "Start Project", icon: Zap,        to: "/project-builder" },
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

  // ── TTS state ─────────────────────────────────────────────────────────────
  const [muted, setMutedState] = useState<boolean>(() => isMuted());
  const [voiceId, setVoiceIdState] = useState<string>(() => getVoiceId());
  const [availableVoices, setAvailableVoices] = useState<VoiceOption[]>(VOICE_OPTIONS);
  const [ttsError, setTtsError] = useState<TTSErrorInfo | null>(null);
  const [dismissedTtsError, setDismissedTtsError] = useState(false);

  // ── Voice transcription (browser SpeechRecognition) ───────────────────────
  const voice = useVoiceTranscription();

  // ── File attachment ────────────────────────────────────────────────────────
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachment, setAttachment] = useState<File | null>(null);

  // ── Mention menu state ────────────────────────────────────────────────────
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [mentionMenuOpen, setMentionMenuOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionAtIndex, setMentionAtIndex] = useState(-1);
  const [mentionedEntities, setMentionedEntities] = useState<MentionEntity[]>([]);

  const projectBgUrl =
    step === "inside-project" && activeProject?.feature_image
      ? activeProject.feature_image
      : null;
  const { url: heroBgUrl, reload: reloadHero } = useHeroImage();
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
  useEffect(() => () => { stopSpeaking(); }, []);

  // ── Load available voices from ElevenLabs on mount ────────────────────────
  useEffect(() => {
    fetchVoices().then(setAvailableVoices).catch(() => {});
  }, []);

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

  // ── Draft change — detects @ to open MentionMenu ───────────────────────────
  const handleDraftChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setDraft(val);
    const cursor = e.target.selectionStart ?? val.length;
    const textBefore = val.slice(0, cursor);
    const atMatch = textBefore.match(/@(\w*)$/);
    if (atMatch) {
      setMentionMenuOpen(true);
      setMentionQuery(atMatch[1]);
      setMentionAtIndex(textBefore.lastIndexOf("@"));
    } else {
      setMentionMenuOpen(false);
      setMentionQuery("");
      setMentionAtIndex(-1);
    }
  }, []);

  // ── Insert mention from MentionMenu ───────────────────────────────────────
  const handleMentionSelect = useCallback(
    (entity: MentionEntity) => {
      setMentionedEntities((prev) => {
        if (prev.some((e) => e.id === entity.id)) return prev;
        return [...prev, entity];
      });
      if (mentionAtIndex >= 0) {
        const before = draft.slice(0, mentionAtIndex);
        const after = draft.slice(mentionAtIndex + 1 + mentionQuery.length);
        setDraft(before + `@${entity.title} ` + after);
      }
      setMentionMenuOpen(false);
      setMentionQuery("");
      setMentionAtIndex(-1);
      textareaRef.current?.focus();
    },
    [draft, mentionAtIndex, mentionQuery],
  );

  const handleSend = useCallback(async () => {
    const text = draft.trim();
    if (!text || isLoading) return;
    stopSpeaking();
    setDraft("");
    voice.setTranscript("");
    setAttachment(null);
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
  }, [draft, isLoading, session, vox, activeProject, authUser, altitude, voice]); // eslint-disable-line react-hooks/exhaustive-deps

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

        {/* Header row — scoped to right of sidebar */}
        <TopChrome
          muted={muted}
          voiceId={voiceId}
          availableVoices={availableVoices}
          onMuteToggle={() => setMuted(!muted)}
          onVoiceChange={(id) => { stopSpeaking(); setVoiceId(id); }}
          onReload={reloadHero}
          onNewSession={handleNewSession}
          activeProject={activeProject}
          onDeselectProject={handleProjectDeselect}
        />

        {/* Centered column: glass panel + pill bar below */}
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 10,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "60px 0 16px",
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 10,
              width: "min(580px, 92vw)",
              height: "100%",
              pointerEvents: "auto",
            }}
          >
            {/* Glass panel */}
            <div
              style={{
                ...GLASS_STYLE,
                flex: 1,
                minHeight: 0,
                width: "100%",
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

              {/* Input section */}
              <div
                style={{
                  flexShrink: 0,
                  borderTop: "1px solid var(--glass-divider)",
                  padding: "10px 14px 12px",
                }}
              >
                {/* Mentioned entity chips */}
                {mentionedEntities.length > 0 && (
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 6 }}>
                    {mentionedEntities.map((e) => (
                      <span
                        key={e.id}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          padding: "2px 8px",
                          borderRadius: 999,
                          background: "var(--skin-accent, #4de0c1)",
                          color: "var(--skin-bg, #fff)",
                          fontSize: 11,
                          fontWeight: 500,
                        }}
                      >
                        @{e.title}
                        <button
                          onClick={() => setMentionedEntities((prev) => prev.filter((x) => x.id !== e.id))}
                          style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", padding: 0, fontSize: 13, lineHeight: 1 }}
                          aria-label={`Remove ${e.title}`}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Input row: large textarea + vertical icon stack to the right */}
                <div style={{ position: "relative" }}>
                  <MentionMenu
                    isOpen={mentionMenuOpen}
                    query={mentionQuery}
                    projectId={activeProject?.id}
                    onSelect={handleMentionSelect}
                    onClose={() => {
                      setMentionMenuOpen(false);
                      setMentionQuery("");
                      setMentionAtIndex(-1);
                    }}
                  />

                  <div style={{ display: "flex", gap: 8, alignItems: "stretch" }}>
                    {/* Hidden file input */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      style={{ display: "none" }}
                      onChange={(e) => {
                        const file = e.target.files?.[0] ?? null;
                        setAttachment(file);
                        if (file) toast.info(`File selected: ${file.name} — attachment will be sent once backend support lands.`);
                        e.target.value = "";
                      }}
                    />

                    <textarea
                      ref={textareaRef}
                      value={draft}
                      onChange={handleDraftChange}
                      onKeyDown={(e) => {
                        if (e.key === "Escape") {
                          setMentionMenuOpen(false);
                          return;
                        }
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          void handleSend();
                        }
                      }}
                      rows={4}
                      placeholder={
                        voice.isListening
                          ? "Listening…"
                          : isLoading
                          ? "Chi is thinking…"
                          : "Ask Chi anything… (type @ to mention)"
                      }
                      disabled={isLoading}
                      style={{
                        flex: 1,
                        resize: "none",
                        background: "var(--glass-input-bg)",
                        border: voice.isListening
                          ? "1px solid var(--skin-accent, #4de0c1)"
                          : "1px solid var(--glass-input-border)",
                        borderRadius: 10,
                        color: "var(--glass-text)",
                        fontSize: 14,
                        padding: "8px 12px",
                        outline: "none",
                        fontFamily: "inherit",
                        opacity: isLoading ? 0.5 : 1,
                        transition: "border-color 0.2s",
                      }}
                    />

                    {/* Vertical icon stack — top to bottom: + Paperclip Mic Send */}
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 4,
                        flexShrink: 0,
                        justifyContent: "space-between",
                      }}
                    >
                      <InputActionButton
                        title="Add entity (@mention)"
                        onClick={() => {
                          setMentionMenuOpen((v) => !v);
                          setMentionQuery("");
                        }}
                        active={mentionMenuOpen}
                      >
                        <Plus size={14} />
                      </InputActionButton>
                      <InputActionButton
                        title="Attach file"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Paperclip size={14} />
                      </InputActionButton>
                      <InputActionButton
                        title={
                          !voice.supported
                            ? "Voice input not supported in this browser"
                            : voice.isListening
                            ? "Stop recording"
                            : "Voice input"
                        }
                        onClick={() => (voice.isListening ? voice.stop() : voice.start())}
                        disabled={!voice.supported}
                        active={voice.isListening}
                      >
                        {voice.isListening ? <MicOff size={14} /> : <Mic size={14} />}
                      </InputActionButton>
                      <button
                        onClick={() => void handleSend()}
                        disabled={!draft.trim() || isLoading}
                        title="Send"
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 8,
                          background: "var(--skin-accent-gradient)",
                          border: "none",
                          color: "white",
                          cursor: draft.trim() && !isLoading ? "pointer" : "not-allowed",
                          opacity: draft.trim() && !isLoading ? 1 : 0.4,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 15,
                          flexShrink: 0,
                        }}
                      >
                        &#x27a4;
                      </button>
                    </div>
                  </div>
                </div>

                {/* Attachment badge */}
                {attachment && (
                  <div
                    style={{
                      marginTop: 6,
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      fontSize: 11,
                      color: "var(--glass-text-soft)",
                    }}
                  >
                    <Paperclip size={10} />
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 220 }}>
                      {attachment.name}
                    </span>
                    <button
                      onClick={() => setAttachment(null)}
                      style={{ background: "transparent", border: "none", cursor: "pointer", color: "inherit", fontSize: 13, padding: 0 }}
                      aria-label="Remove attachment"
                    >
                      ×
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Pill bar — outside and below the glass panel */}
            <div
              style={{
                display: "flex",
                gap: 6,
                width: "100%",
                overflowX: "auto",
                scrollbarWidth: "none",
                flexShrink: 0,
                paddingBottom: 4,
              }}
            >
              {NAV_PILLS.map((pill) => (
                <button
                  key={pill.id}
                  onClick={() => void navigate({ to: pill.to })}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "6px 14px",
                    borderRadius: "var(--xr-pill, 999px)",
                    border: "1px solid var(--glass-pill-border)",
                    background: "var(--glass-pill-bg)",
                    backdropFilter: "blur(8px)",
                    WebkitBackdropFilter: "blur(8px)",
                    color: "var(--glass-text)",
                    cursor: "pointer",
                    fontSize: 12,
                    fontWeight: 500,
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                  }}
                >
                  <pill.icon size={12} />
                  {pill.label}
                </button>
              ))}
            </div>
          </div>
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

// ─── Top chrome — scoped to right of sidebar ──────────────────────────────────
function TopChrome({
  muted,
  voiceId,
  availableVoices,
  onMuteToggle,
  onVoiceChange,
  onReload,
  onNewSession,
  activeProject,
  onDeselectProject,
}: {
  muted: boolean;
  voiceId: string;
  availableVoices: VoiceOption[];
  onMuteToggle: () => void;
  onVoiceChange: (id: string) => void;
  onReload: () => void;
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
        left: "var(--sidebar-width, 240px)",
        zIndex: 20,
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-end",
        gap: 8,
        padding: "12px 16px",
        pointerEvents: "none",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, pointerEvents: "auto" }}>
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
        {/* 1. New chat */}
        <ChromeButton onClick={onNewSession} title="New conversation">
          <MessageSquarePlus size={15} />
        </ChromeButton>
        {/* 2. Reload background */}
        <ChromeButton onClick={onReload} title="Reload background">
          <RefreshCw size={15} />
        </ChromeButton>
        {/* 3. Voice selector */}
        <select
          value={voiceId}
          onChange={(e) => onVoiceChange(e.target.value)}
          aria-label="Select voice"
          title="Voice"
          style={{
            height: 34,
            borderRadius: "var(--xr-pill, 999px)",
            background: "var(--glass-pill-bg)",
            border: "1px solid var(--glass-pill-border)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            color: "var(--glass-text)",
            fontSize: 12,
            padding: "0 28px 0 12px",
            cursor: "pointer",
            outline: "none",
          }}
        >
          {availableVoices.map((v) => (
            <option key={v.id} value={v.id}>
              {v.label}
            </option>
          ))}
        </select>
        {/* 4. TTS mute toggle */}
        <ChromeButton
          onClick={onMuteToggle}
          title={muted ? "Enable voice output" : "Mute voice output"}
        >
          {muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
        </ChromeButton>
      </div>
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
        background: "var(--glass-pill-bg)",
        border: "1px solid var(--glass-pill-border)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        color: "var(--glass-text)",
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

// ─── Input action button ───────────────────────────────────────────────────────
function InputActionButton({
  children,
  onClick,
  title,
  disabled,
  active,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title?: string;
  disabled?: boolean;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      disabled={disabled}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 32,
        height: 32,
        borderRadius: 7,
        border: "1px solid var(--glass-border-color)",
        background: active ? "var(--skin-accent, #4de0c1)" : "transparent",
        color: active ? "var(--skin-bg, #fff)" : "var(--glass-text-soft)",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.4 : 1,
        transition: "background 0.15s, color 0.15s",
      }}
    >
      {children}
    </button>
  );
}
