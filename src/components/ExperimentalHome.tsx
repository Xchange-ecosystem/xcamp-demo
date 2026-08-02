/**
 * ExperimentalHome — Ecosystem Home and Project Home layouts for the
 * ?nav=experimental sidebar experiment. Rendered inside CompanionHomePage
 * when navVariant === "experimental"; replaced by ExperimentalChatView
 * after the user sends their first message.
 *
 * All state lives in home.tsx; these are purely presentational.
 */

import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Paperclip, Plus, Send, Volume2, VolumeX, Zap } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { useActiveProject } from "@/contexts/active-project";
import { MentionMenu, type MentionEntity } from "@/components/MentionMenu";
import { PageHeroShell } from "@/components/PageHeroShell";
import { ChatThread } from "@/components/companion/ChatThread";
import type { ChatMessage } from "@/components/companion/ChatThread";
import type { ProjectFull, XcampUser } from "@/types/xcamp";
import type { AICard } from "@xchange/client";
import type { EntityType } from "@/components/JournalFlow";
import { useTheme } from "@/lib/theme";
import {
  fetchProjectMetrics,
  fetchProjectDetailMetrics,
  type ProjectMetrics,
  type ProjectDetailMetrics,
} from "@/lib/xcamp-api";
import { Typewriter } from "@/shared/ui/Typewriter";
import {
  speak,
  stopSpeaking,
  isMuted,
  setMuted,
  subscribeMuted,
  prefetchTTS,
  onAudioUnlock,
} from "@/lib/ttsClient";

// ─── Hero background image paths ─────────────────────────────────────────────
const HERO_DARK_SRC = "https://ueebzuleyrnsrxbowdfa.supabase.co/storage/v1/object/public/App%20media/Xcamp-Nox%20Home%20Background%20Dark.png";
const HERO_LIGHT_SRC = "https://ueebzuleyrnsrxbowdfa.supabase.co/storage/v1/object/public/App%20media/Xcamp-Nox%20Home%20Background%20Light.png";

// ─── Recommendation card video paths ─────────────────────────────────────────
const CARD_VIDEOS = {
  journal: "/assets/cards/journal.mp4",
  note: "/assets/cards/note.mp4",
  project: "/assets/cards/project.mp4",
  navigator: "/assets/cards/navigator.mp4",
} as const;

// ─── CSS animation for the shifting-color hero overlay ───────────────────────
// prefers-reduced-motion is handled in the style block itself.
const HERO_ANIMATION_STYLE = `
  @keyframes eco-hero-shift {
    0%   { background-position: 0% 50%; }
    50%  { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }
  .eco-hero-overlay {
    animation: eco-hero-shift 12s ease infinite;
  }
  @media (prefers-reduced-motion: reduce) {
    .eco-hero-overlay {
      animation: none !important;
      background-position: 0% 50%;
    }
  }
`;

// ─── Shared prop types ────────────────────────────────────────────────────────

interface VoiceState {
  isListening: boolean;
  supported: boolean;
  start: () => void;
  stop: () => void;
  setTranscript: (t: string) => void;
}

export interface ExperimentalHomeProps {
  projects: ProjectFull[];
  onProjectSelect: (project: ProjectFull) => void;
  onCreateProject: () => void;
  draft: string;
  onDraftChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onSend: () => void;
  isLoading: boolean;
  voice: VoiceState;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  attachment: File | null;
  onAttachmentSet: (file: File | null) => void;
  mentionMenuOpen: boolean;
  mentionQuery: string;
  onMentionSelect: (entity: MentionEntity) => void;
  mentionedEntities: MentionEntity[];
  onMentionedEntitiesChange: (entities: MentionEntity[]) => void;
  onMentionMenuClose: () => void;
  onMentionToggle: () => void;
  activeProject: ProjectFull | null;
  authUser: XcampUser | null;
}

export interface ExperimentalChatProps {
  messages: ChatMessage[];
  typingMessageId?: string;
  isLoading: boolean;
  projects: ProjectFull[];
  onProjectSelect: (project: ProjectFull) => void;
  onCreateProject: () => void;
  onCardConfirm: (card: AICard, selectedType: EntityType) => void;
  onCardDismiss: (card: AICard) => void;
  hiddenCardIds: Set<string>;
  draft: string;
  onDraftChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onSend: () => void;
  voice: VoiceState;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  attachment: File | null;
  onAttachmentSet: (file: File | null) => void;
  mentionMenuOpen: boolean;
  mentionQuery: string;
  onMentionSelect: (entity: MentionEntity) => void;
  mentionedEntities: MentionEntity[];
  onMentionedEntitiesChange: (entities: MentionEntity[]) => void;
  onMentionMenuClose: () => void;
  onMentionToggle: () => void;
  activeProject: ProjectFull | null;
  onBack: () => void;
}

// ─── Shared input box ─────────────────────────────────────────────────────────

function InputBox({
  draft,
  onDraftChange,
  onSend,
  isLoading,
  voice,
  fileInputRef,
  attachment,
  onAttachmentSet,
  mentionMenuOpen,
  mentionQuery,
  onMentionSelect,
  mentionedEntities,
  onMentionedEntitiesChange,
  onMentionMenuClose,
  onMentionToggle,
  activeProjectId,
  placeholder,
  placement = "above",
}: {
  draft: string;
  onDraftChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onSend: () => void;
  isLoading: boolean;
  voice: VoiceState;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  attachment: File | null;
  onAttachmentSet: (file: File | null) => void;
  mentionMenuOpen: boolean;
  mentionQuery: string;
  onMentionSelect: (entity: MentionEntity) => void;
  mentionedEntities: MentionEntity[];
  onMentionedEntitiesChange: (entities: MentionEntity[]) => void;
  onMentionMenuClose: () => void;
  onMentionToggle: () => void;
  activeProjectId?: string;
  placeholder?: string;
  placement?: "above" | "below";
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  return (
    <div
      style={{
        border: "1px solid var(--skin-line)",
        borderRadius: 12,
        background: "var(--skin-surface)",
        padding: "10px 12px 10px",
        boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
      }}
    >
      {/* Mention chips */}
      {mentionedEntities.length > 0 && (
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 6 }}>
          {mentionedEntities.map((e) => (
            <span
              key={e.id}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 3,
                padding: "1px 8px",
                borderRadius: 999,
                background: "var(--skin-accent, #4de0c1)",
                color: "var(--skin-bg, #fff)",
                fontSize: 11,
                fontWeight: 500,
              }}
            >
              @{e.title}
              <button
                onClick={() => onMentionedEntitiesChange(mentionedEntities.filter((x) => x.id !== e.id))}
                style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", padding: 0, fontSize: 13, lineHeight: 1 }}
                aria-label={`Remove ${e.title}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Input row */}
      <div style={{ position: "relative" }}>
        <MentionMenu
          isOpen={mentionMenuOpen}
          query={mentionQuery}
          projectId={activeProjectId}
          onSelect={onMentionSelect}
          onClose={onMentionMenuClose}
          placement={placement}
        />
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={onDraftChange}
          onKeyDown={(e) => {
            if (e.key === "Escape") { onMentionMenuClose(); return; }
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSend(); }
          }}
          rows={4}
          placeholder={
            voice.isListening ? "Listening…" : isLoading ? "Chi is thinking…" : (placeholder ?? "Ask Chi anything… (@ to mention)")
          }
          disabled={isLoading}
          style={{
            width: "100%",
            resize: "none",
            overflowY: "auto",
            border: voice.isListening ? "1px solid var(--skin-accent, #4de0c1)" : "1px solid var(--skin-line)",
            borderRadius: 8,
            background: "transparent",
            color: "var(--skin-ink)",
            fontSize: 14,
            padding: "8px 10px",
            outline: "none",
            fontFamily: "inherit",
            opacity: isLoading ? 0.5 : 1,
            boxSizing: "border-box",
          }}
        />
      </div>

      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
        <div style={{ display: "flex", gap: 2 }}>
          <input
            ref={fileInputRef}
            type="file"
            style={{ display: "none" }}
            onChange={(e) => { onAttachmentSet(e.target.files?.[0] ?? null); e.target.value = ""; }}
          />
          <ToolbarBtn title="Add mention" onClick={onMentionToggle} active={mentionMenuOpen}>
            <Plus size={15} />
          </ToolbarBtn>
          <ToolbarBtn title="Attach file" onClick={() => fileInputRef.current?.click()}>
            <Paperclip size={15} />
          </ToolbarBtn>
          <ToolbarBtn
            title={!voice.supported ? "Voice not supported" : voice.isListening ? "Stop" : "Voice input"}
            onClick={() => voice.isListening ? voice.stop() : voice.start()}
            disabled={!voice.supported}
            active={voice.isListening}
          >
            {voice.isListening ? <MicOff size={15} /> : <Mic size={15} />}
          </ToolbarBtn>
        </div>

        <button
          onClick={onSend}
          disabled={!draft.trim() || isLoading}
          style={{
            padding: "6px 16px",
            borderRadius: 8,
            background: "var(--skin-accent-gradient)",
            border: "none",
            color: "white",
            fontWeight: 600,
            fontSize: 13,
            cursor: draft.trim() && !isLoading ? "pointer" : "not-allowed",
            opacity: draft.trim() && !isLoading ? 1 : 0.4,
          }}
        >
          Send ➤
        </button>
      </div>

      {/* Attachment badge */}
      {attachment && (
        <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "var(--skin-ink-soft)" }}>
          <Paperclip size={10} />
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 220 }}>
            {attachment.name}
          </span>
          <button
            onClick={() => onAttachmentSet(null)}
            style={{ background: "transparent", border: "none", cursor: "pointer", color: "inherit", fontSize: 13, padding: 0 }}
            aria-label="Remove attachment"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}

function ToolbarBtn({
  children, onClick, title, disabled, active,
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
        width: 30,
        height: 30,
        borderRadius: 6,
        border: "1px solid var(--skin-line)",
        background: active ? "var(--skin-accent, #4de0c1)" : "transparent",
        color: active ? "var(--skin-bg, #fff)" : "var(--skin-ink-soft)",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.4 : 1,
      }}
    >
      {children}
    </button>
  );
}

// ─── Greeting helper ──────────────────────────────────────────────────────────

function timeGreeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

function firstName(user: XcampUser | null) {
  return user?.displayName?.split(" ")?.[0] ?? "there";
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ─── Voice toggle button ──────────────────────────────────────────────────────
// Matches the ChromeButton style from home.tsx TopChrome. Fixed top-right.

function VoiceToggle({ muted, onToggle }: { muted: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      title={muted ? "Enable voice narration" : "Mute voice narration"}
      aria-label={muted ? "Enable voice narration" : "Mute voice narration"}
      style={{
        position: "fixed",
        top: 12,
        right: 16,
        zIndex: 20,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 34,
        height: 34,
        borderRadius: "50%",
        background: "var(--glass-pill-bg, rgba(255,255,255,0.15))",
        border: "1px solid var(--glass-pill-border, rgba(255,255,255,0.25))",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        color: "var(--glass-text, #fff)",
        cursor: "pointer",
        boxShadow: "0 2px 8px rgba(0,0,0,0.18)",
      }}
    >
      {muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
    </button>
  );
}

// ─── Ecosystem hero layout (Phase 5) ─────────────────────────────────────────
// Mirrors PageHeroShell's structural pattern (hero banner + overlapping card)
// but adds an animated colour-shift overlay inside the hero area.
// Light / dark image selection is done via the resolved theme.

function EcosystemHeroLayout({
  heroSrc,
  children,
}: {
  heroSrc: string | undefined;
  children: React.ReactNode;
}) {
  const HERO_HEIGHTS = "h-[300px] sm:h-[560px] md:h-[640px]";
  const OVERLAP = 500;

  return (
    <div className="min-h-screen w-full" style={{ background: "var(--skin-surface)" }}>
      {/* Inject keyframe animation + prefers-reduced-motion rule */}
      <style>{HERO_ANIMATION_STYLE}</style>

      {/* Hero banner */}
      <div
        className={`relative w-full overflow-hidden ${HERO_HEIGHTS}`}
        style={{ background: "var(--skin-accent-gradient)" }}
      >
        {/* Background image (when available) */}
        {heroSrc && (
          <img
            src={heroSrc}
            alt=""
            aria-hidden
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}

        {/* Accent multiply tint — same as PageHeroShell */}
        {heroSrc && (
          <div
            aria-hidden
            className="absolute inset-0 pointer-events-none"
            style={{ background: "var(--skin-accent)", mixBlendMode: "multiply", opacity: 0.55 }}
          />
        )}

        {/* Animated shifting-colour overlay — driven by theme accent tokens */}
        <div
          aria-hidden
          className="eco-hero-overlay absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: [
              "linear-gradient(270deg,",
              "  var(--skin-accent, #4de0c1) 0%,",
              "  color-mix(in srgb, var(--skin-accent, #4de0c1) 60%, var(--skin-bg, #fff)) 30%,",
              "  color-mix(in srgb, var(--skin-surface, #f5f5f5) 70%, var(--skin-accent, #4de0c1)) 60%,",
              "  var(--skin-accent, #4de0c1) 100%",
              ")",
            ].join(""),
            backgroundSize: "300% 300%",
            opacity: heroSrc ? 0.28 : 0.55,
            mixBlendMode: heroSrc ? "screen" : "normal",
          }}
        />

        {/* Bottom fade to surface — same as PageHeroShell */}
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-2/3 pointer-events-none"
          style={{
            background:
              "linear-gradient(to bottom, transparent 0%, color-mix(in srgb, var(--skin-surface) 55%, transparent) 55%, var(--skin-surface) 100%)",
          }}
        />
      </div>

      {/* Overlapping content card */}
      <div
        className="relative mx-auto w-full px-4 sm:px-6 lg:w-[80%] lg:max-w-[1400px]"
        style={{ marginTop: -OVERLAP }}
      >
        <div
          className="rounded-2xl shadow-xl"
          style={{
            background: "var(--skin-bg)",
            border: "1px solid var(--skin-line)",
            color: "var(--skin-ink)",
            padding: "32px 32px 48px",
          }}
        >
          {children}
        </div>
      </div>

      <div className="h-12" />
    </div>
  );
}

// ─── Project tile (Phase 8 — fully clickable, with metrics) ──────────────────

function ProjectTile({
  project,
  metrics,
  onSelect,
}: {
  project: ProjectFull;
  metrics?: { objectives: number; tasks: number };
  onSelect: (p: ProjectFull) => void;
}) {
  return (
    <button
      onClick={() => onSelect(project)}
      style={{
        flexShrink: 0,
        width: 200,
        border: "1px solid var(--skin-line)",
        borderRadius: 10,
        overflow: "hidden",
        background: "var(--skin-card, var(--skin-surface))",
        cursor: "pointer",
        textAlign: "left",
        padding: 0,
        transition: "box-shadow 0.15s, border-color 0.15s",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 16px rgba(0,0,0,0.12)";
        (e.currentTarget as HTMLElement).style.borderColor = "var(--skin-accent, #4de0c1)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = "none";
        (e.currentTarget as HTMLElement).style.borderColor = "var(--skin-line)";
      }}
    >
      {project.feature_image ? (
        <img
          src={project.feature_image}
          alt={project.name}
          style={{ width: "100%", height: 80, objectFit: "cover", display: "block" }}
        />
      ) : (
        <div
          style={{
            width: "100%",
            height: 80,
            background: project.color ?? "var(--skin-accent, #4de0c1)",
            opacity: 0.18,
          }}
        />
      )}
      <div style={{ padding: "10px 12px 12px" }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "var(--skin-ink)",
            marginBottom: 6,
            lineHeight: 1.3,
            overflow: "hidden",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
          }}
        >
          {project.name}
        </div>
        {metrics && (
          <div style={{ display: "flex", gap: 8 }}>
            <MetricPill label="obj" count={metrics.objectives} />
            <MetricPill label="tasks" count={metrics.tasks} />
          </div>
        )}
      </div>
    </button>
  );
}

function MetricPill({ label, count }: { label: string; count: number }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 3,
        fontSize: 10,
        fontWeight: 600,
        color: "var(--skin-ink-faint)",
        background: "var(--skin-surface)",
        border: "1px solid var(--skin-line)",
        borderRadius: 4,
        padding: "1px 5px",
      }}
    >
      <span style={{ fontVariantNumeric: "tabular-nums" }}>{count}</span>
      <span style={{ fontWeight: 400 }}>{label}</span>
    </span>
  );
}

function NewProjectTile({ onSelect }: { onSelect: () => void }) {
  return (
    <button
      onClick={onSelect}
      style={{
        flexShrink: 0,
        width: 200,
        height: 142,
        border: "1.5px dashed var(--skin-line)",
        borderRadius: 10,
        background: "transparent",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        color: "var(--skin-ink-faint)",
      }}
    >
      <Zap size={20} />
      <span style={{ fontSize: 12, fontWeight: 500 }}>New Project</span>
    </button>
  );
}

// ─── Tool tile for Project Home (Phase 14) ───────────────────────────────────
// Whole-tile-clickable; video plays on hover, resets on mouse-leave.
// videoSrc omitted → placeholder slot for pending asset.

function ToolTile({
  title,
  videoSrc,
  to,
}: {
  title: string;
  videoSrc?: string;
  to: string;
}) {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);

  return (
    <button
      onClick={() =>
        void navigate({ to: to as never, search: ((prev: Record<string, unknown>) => ({ ...prev })) as never })
      }
      onMouseEnter={(e) => {
        (e.currentTarget).style.borderColor = "var(--skin-accent, #4de0c1)";
        videoRef.current?.play().catch(() => undefined);
      }}
      onMouseLeave={(e) => {
        (e.currentTarget).style.borderColor = "var(--skin-line)";
        const v = videoRef.current;
        if (!v) return;
        v.pause();
        v.currentTime = 0;
      }}
      style={{
        flex: 1,
        border: "1px solid var(--skin-line)",
        borderRadius: 10,
        overflow: "hidden",
        background: "var(--skin-card, var(--skin-surface))",
        cursor: "pointer",
        textAlign: "left",
        padding: 0,
        transition: "border-color 0.15s, box-shadow 0.15s",
      }}
    >
      <div style={{ width: "100%", aspectRatio: "1 / 1", overflow: "hidden", background: "var(--skin-surface)" }}>
        {videoSrc ? (
          <video
            ref={videoRef}
            src={videoSrc}
            muted
            preload="metadata"
            playsInline
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--skin-ink-faint)",
              fontSize: 11,
              borderBottom: "1px solid var(--skin-line)",
            }}
          >
            Video coming soon
          </div>
        )}
      </div>
      <div style={{ padding: "9px 12px 12px", fontSize: 13, fontWeight: 600, color: "var(--skin-ink)" }}>
        {title}
      </div>
    </button>
  );
}

// ─── Project-select + Send for Ecosystem Home recommend cards (Phase 15) ─────

function ProjectSelectAction({
  projects,
  to,
}: {
  projects: ProjectFull[];
  to: string;
}) {
  const navigate = useNavigate();
  const { setActiveProjectId } = useActiveProject();
  const [selectedId, setSelectedId] = useState("");

  const handleSend = () => {
    if (!selectedId) return;
    setActiveProjectId(selectedId);
    void navigate({ to: to as never, search: ((prev: Record<string, unknown>) => ({ ...prev })) as never });
  };

  return (
    <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 8 }}>
      <select
        value={selectedId}
        onChange={(e) => setSelectedId(e.target.value)}
        style={{
          flex: 1,
          minWidth: 0,
          padding: "5px 32px 5px 8px",
          borderRadius: 6,
          border: "1px solid var(--skin-line)",
          background: "var(--skin-surface)",
          color: selectedId ? "var(--skin-ink)" : "var(--skin-ink-faint)",
          fontSize: 12,
          outline: "none",
          cursor: "pointer",
          appearance: "none",
          WebkitAppearance: "none",
          backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E\")",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "right 10px center",
          backgroundSize: "0.8rem",
        }}
      >
        <option value="">Select project to start.</option>
        {projects.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
      <button
        onClick={handleSend}
        disabled={!selectedId}
        title="Go"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          width: 30,
          height: 30,
          borderRadius: 6,
          border: selectedId ? "none" : "1px solid var(--skin-line)",
          background: selectedId ? "var(--skin-accent-gradient)" : "transparent",
          color: selectedId ? "white" : "var(--skin-ink-faint)",
          cursor: selectedId ? "pointer" : "not-allowed",
          opacity: selectedId ? 1 : 0.45,
          transition: "background 0.15s, opacity 0.15s",
        } as React.CSSProperties}
      >
        <Send size={14} />
      </button>
    </div>
  );
}

// "Get started with AI." button for the Start-a-project card (Phase 15)
function GetStartedAction({ to }: { to: string }) {
  const navigate = useNavigate();
  return (
    <button
      onClick={() =>
        void navigate({ to: to as never, search: ((prev: Record<string, unknown>) => ({ ...prev })) as never })
      }
      style={{
        marginTop: 8,
        padding: "5px 12px",
        borderRadius: 6,
        border: "none",
        background: "var(--skin-accent-gradient)",
        color: "white",
        fontWeight: 600,
        fontSize: 12,
        cursor: "pointer",
        display: "inline-block",
        whiteSpace: "nowrap",
      }}
    >
      Get started with AI.
    </button>
  );
}

// ─── Recommendation card with hover-play video (Phase 9, redesigned Phase 15) ─
// "Go to →" removed. Pass `action` for the per-card CTA.

function RecommendCard({
  title,
  description,
  videoSrc,
  action,
}: {
  title: string;
  description: string;
  videoSrc: string;
  action?: React.ReactNode;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  function handleMouseEnter() {
    videoRef.current?.play().catch(() => undefined);
  }
  function handleMouseLeave() {
    const v = videoRef.current;
    if (!v) return;
    v.pause();
    v.currentTime = 0;
  }

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        display: "flex",
        alignItems: "flex-start",
        border: "1px solid var(--skin-line)",
        borderRadius: 10,
        overflow: "hidden",
        background: "var(--skin-card, var(--skin-surface))",
        cursor: "default",
      }}
    >
      {/* Video thumbnail — square 1:1 */}
      <div
        style={{
          flexShrink: 0,
          width: 72,
          height: 72,
          overflow: "hidden",
          background: "var(--skin-surface)",
        }}
      >
        <video
          ref={videoRef}
          src={videoSrc}
          muted
          preload="metadata"
          playsInline
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
      </div>

      {/* Text + action */}
      <div style={{ flex: 1, padding: "10px 14px 12px" }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--skin-ink)" }}>{title}</div>
        <div style={{ fontSize: 12, color: "var(--skin-ink-soft)", marginTop: 2 }}>{description}</div>
        {action}
      </div>
    </div>
  );
}

// ─── Ecosystem Home (Phase 5) ─────────────────────────────────────────────────

export function EcosystemHomeView(props: ExperimentalHomeProps) {
  const { projects, onProjectSelect, onCreateProject, authUser } = props;
  const { resolved: theme } = useTheme();

  // ── TTS / mute ───────────────────────────────────────────────────────────
  const [muted, setMutedState] = useState<boolean>(() => isMuted());
  const mutedRef = useRef(muted);
  mutedRef.current = muted;
  useEffect(() => subscribeMuted((v) => setMutedState(v)), []);

  // ── Prefetch all narration audio immediately on mount ───────────────────
  useEffect(() => {
    const ps = projects;
    const au = authUser;
    const greet = `${timeGreeting()}, ${firstName(au)}.`;
    const sub = ps.length > 0
      ? `You have ${ps.length} project${ps.length === 1 ? "" : "s"}. What do you want to work on today?`
      : "What do you want to work on today?";
    prefetchTTS(`${greet} ${sub}`);
    prefetchTTS("Ask Chi anything, or jot down what's on your mind…");
    prefetchTTS("Or jump into a project.");
    prefetchTTS(
      "I have also prepared some useful tools for you. Here's what I recommend: Daily journal: Reflect on today and capture what matters. Quick note: Capture a thought before it slips away. Start a project: Launch a new initiative with the Backcaster.",
    );
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Narration phase: 0=hidden 1=heading 2=input 3=projects 4=cards ──────
  const [phase, setPhase] = useState(0);
  const phaseRef = useRef(0);
  phaseRef.current = phase;
  const projectsRef = useRef(projects);
  projectsRef.current = projects;
  const authUserRef = useRef(authUser);
  authUserRef.current = authUser;

  useEffect(() => {
    let cancelled = false;
    async function run() {
      await delay(450);
      if (cancelled) return;

      const ps = projectsRef.current;
      const au = authUserRef.current;
      const greet = `${timeGreeting()}, ${firstName(au)}.`;
      const sub = ps.length > 0
        ? `You have ${ps.length} project${ps.length === 1 ? "" : "s"}. What do you want to work on today?`
        : "What do you want to work on today?";
      const TEXT1 = `${greet} ${sub}`;
      const TEXT2 = "Ask Chi anything, or jot down what's on your mind…";
      const TEXT3 = "Or jump into a project.";
      const TEXT4 =
        "I have also prepared some useful tools for you. Here's what I recommend: Daily journal: Reflect on today and capture what matters. Quick note: Capture a thought before it slips away. Start a project: Launch a new initiative with the Backcaster.";

      setPhase(1);
      if (!mutedRef.current) speak(TEXT1);
      await delay(Math.max(TEXT1.length * 38, 1200));
      if (cancelled) return;

      setPhase(2);
      if (!mutedRef.current) speak(TEXT2);
      await delay(Math.max(TEXT2.length * 38, 800));
      if (cancelled) return;

      setPhase(3);
      if (!mutedRef.current) speak(TEXT3);
      await delay(Math.max(TEXT3.length * 38, 600));
      if (cancelled) return;

      setPhase(4);
      if (!mutedRef.current) speak(TEXT4);
    }
    void run();
    return () => {
      cancelled = true;
      stopSpeaking();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── On first browser interaction, cancel stale queued audio and re-speak
  //    whichever phase is currently visible (phases queue up while blocked). ──
  useEffect(() => {
    return onAudioUnlock(() => {
      const p = phaseRef.current;
      if (p === 0 || mutedRef.current) return;
      stopSpeaking();
      const ps = projectsRef.current;
      const au = authUserRef.current;
      const greet = `${timeGreeting()}, ${firstName(au)}.`;
      const sub = ps.length > 0
        ? `You have ${ps.length} project${ps.length === 1 ? "" : "s"}. What do you want to work on today?`
        : "What do you want to work on today?";
      const texts = [
        `${greet} ${sub}`,
        "Ask Chi anything, or jot down what's on your mind…",
        "Or jump into a project.",
        "I have also prepared some useful tools for you. Here's what I recommend: Daily journal: Reflect on today and capture what matters. Quick note: Capture a thought before it slips away. Start a project: Launch a new initiative with the Backcaster.",
      ];
      const text = texts[p - 1];
      if (text) speak(text);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Project metrics ──────────────────────────────────────────────────────
  const [metrics, setMetrics] = useState<ProjectMetrics>({});
  useEffect(() => {
    if (!authUser || !projects.length) return;
    let cancelled = false;
    fetchProjectMetrics(authUser, projects.map((p) => p.id))
      .then((m) => { if (!cancelled) setMetrics(m); })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [authUser, projects]);

  const heroSrc = theme === "dark" ? HERO_DARK_SRC : HERO_LIGHT_SRC;
  const greetText = `${timeGreeting()}, ${firstName(authUser)}.`;
  const sublineText = projects.length > 0
    ? `You have ${projects.length} project${projects.length === 1 ? "" : "s"}. What do you want to work on today?`
    : "What do you want to work on today?";

  const FADE: React.CSSProperties = { transition: "opacity 0.5s ease" };

  return (
    <>
      <VoiceToggle muted={muted} onToggle={() => setMuted(!muted)} />
      <EcosystemHeroLayout heroSrc={heroSrc}>
        {/* Greeting — phase 1 */}
        <div style={{ ...FADE, opacity: phase >= 1 ? 1 : 0 }}>
          <h1
            style={{
              fontSize: 26,
              fontWeight: 700,
              color: "var(--skin-ink)",
              marginBottom: 4,
              letterSpacing: "-0.01em",
            }}
          >
            {phase >= 1 ? <Typewriter text={greetText} caret={false} /> : null}
          </h1>
          <p style={{ fontSize: 14, color: "var(--skin-ink-soft)", marginBottom: 28 }}>
            {sublineText}
          </p>
        </div>

        {/* Input — phase 2 */}
        <div style={{ ...FADE, opacity: phase >= 2 ? 1 : 0, marginBottom: 40 }}>
          <InputBox
            {...props}
            activeProjectId={undefined}
            placeholder="Ask Chi anything, or jot down what's on your mind…"
            placement="below"
          />
        </div>

        {/* Project tiles — phase 3 */}
        {projects.length > 0 && (
          <section style={{ ...FADE, opacity: phase >= 3 ? 1 : 0, marginBottom: 36 }}>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--skin-ink-faint)",
                marginBottom: 12,
              }}
            >
              Jump into a project
            </div>
            <div
              style={{
                display: "flex",
                gap: 12,
                overflowX: "auto",
                paddingBottom: 4,
                scrollbarWidth: "none",
              }}
            >
              {projects.map((p) => (
                <ProjectTile
                  key={p.id}
                  project={p}
                  metrics={metrics[p.id]}
                  onSelect={onProjectSelect}
                />
              ))}
              <NewProjectTile onSelect={onCreateProject} />
            </div>
          </section>
        )}

        {/* Recommendation cards — phase 4 */}
        <section style={{ ...FADE, opacity: phase >= 4 ? 1 : 0 }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--skin-ink-faint)",
              marginBottom: 12,
            }}
          >
            Here's what I recommend
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <RecommendCard
              title="Daily journal"
              description="Reflect on today and capture what matters."
              videoSrc={CARD_VIDEOS.journal}
              action={<ProjectSelectAction projects={projects} to="/journal" />}
            />
            <RecommendCard
              title="Quick note"
              description="Capture a thought before it slips away."
              videoSrc={CARD_VIDEOS.note}
              action={<ProjectSelectAction projects={projects} to="/notes" />}
            />
            <RecommendCard
              title="Start a project"
              description="Launch a new initiative with Backcaster."
              videoSrc={CARD_VIDEOS.project}
              action={<GetStartedAction to="/project-builder" />}
            />
          </div>
        </section>
      </EcosystemHeroLayout>
    </>
  );
}

// ─── Project Home (Phase 6) ───────────────────────────────────────────────────

export function ProjectHomeView(props: ExperimentalHomeProps) {
  const { activeProject, authUser } = props;

  // ── TTS / mute ───────────────────────────────────────────────────────────
  const [muted, setMutedState] = useState<boolean>(() => isMuted());
  const mutedRef = useRef(muted);
  mutedRef.current = muted;
  useEffect(() => subscribeMuted((v) => setMutedState(v)), []);

  // ── Prefetch static narration texts immediately; TEXT1 prefetched on metrics load ──
  useEffect(() => {
    prefetchTTS("Ask Chi about your project, or jot something down…");
    prefetchTTS("Here are your tools.");
    prefetchTTS("Here are some suggested next steps.");
  }, []);

  // ── Project detail metrics (goals, total tasks, open tasks) ──────────────
  const [detailMetrics, setDetailMetrics] = useState<ProjectDetailMetrics>({
    objectives: 0,
    totalTasks: 0,
    openTasks: 0,
  });
  useEffect(() => {
    if (!authUser || !activeProject) return;
    let cancelled = false;
    const projectName = activeProject.name;
    fetchProjectDetailMetrics(authUser, activeProject.id)
      .then((m) => {
        if (!cancelled) {
          setDetailMetrics(m);
          // Prefetch TEXT1 now that real metrics are available — gives ~400ms
          // of lead time before the narration sequence reaches phase 1
          prefetchTTS(
            `This is your project ${projectName}. You have ${m.objectives} goal${m.objectives === 1 ? "" : "s"}, ${m.totalTasks} task${m.totalTasks === 1 ? "" : "s"} in total, ${m.openTasks} task${m.openTasks === 1 ? "" : "s"} are currently open. What would you like to start with?`,
          );
        }
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [authUser, activeProject?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Narration phase: 0=hidden 1=heading 2=input 3=tools 4=suggestions ───
  const [phase, setPhase] = useState(0);
  const phaseRef = useRef(0);
  phaseRef.current = phase;
  const activeProjectRef = useRef(activeProject);
  activeProjectRef.current = activeProject;
  const detailMetricsRef = useRef(detailMetrics);
  detailMetricsRef.current = detailMetrics;

  useEffect(() => {
    let cancelled = false;
    async function run() {
      // Wait for metrics to load (up to 1200ms) before building narration text
      await delay(800);
      if (cancelled) return;

      const proj = activeProjectRef.current;
      const m = detailMetricsRef.current;
      const projectName = proj?.name ?? "your project";
      const TEXT1 = `This is your project ${projectName}. You have ${m.objectives} goal${m.objectives === 1 ? "" : "s"}, ${m.totalTasks} task${m.totalTasks === 1 ? "" : "s"} in total, ${m.openTasks} task${m.openTasks === 1 ? "" : "s"} are currently open. What would you like to start with?`;
      const TEXT2 = "Ask Chi about your project, or jot something down…";
      const TEXT3 = "Here are your tools.";
      const TEXT4 = "Here are some suggested next steps.";

      setPhase(1);
      if (!mutedRef.current) speak(TEXT1);
      await delay(Math.max(TEXT1.length * 38, 1400));
      if (cancelled) return;

      setPhase(2);
      if (!mutedRef.current) speak(TEXT2);
      await delay(Math.max(TEXT2.length * 38, 800));
      if (cancelled) return;

      setPhase(3);
      if (!mutedRef.current) speak(TEXT3);
      await delay(Math.max(TEXT3.length * 38, 600));
      if (cancelled) return;

      setPhase(4);
      if (!mutedRef.current) speak(TEXT4);
    }
    void run();
    return () => {
      cancelled = true;
      stopSpeaking();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── On first browser interaction, cancel stale queued audio and re-speak
  //    whichever phase is currently visible (phases queue up while blocked). ──
  useEffect(() => {
    return onAudioUnlock(() => {
      const p = phaseRef.current;
      if (p === 0 || mutedRef.current) return;
      stopSpeaking();
      const proj = activeProjectRef.current;
      const m = detailMetricsRef.current;
      const projectName = proj?.name ?? "your project";
      const TEXT1 = `This is your project ${projectName}. You have ${m.objectives} goal${m.objectives === 1 ? "" : "s"}, ${m.totalTasks} task${m.totalTasks === 1 ? "" : "s"} in total, ${m.openTasks} task${m.openTasks === 1 ? "" : "s"} are currently open. What would you like to start with?`;
      const texts = [
        TEXT1,
        "Ask Chi about your project, or jot something down…",
        "Here are your tools.",
        "Here are some suggested next steps.",
      ];
      const text = texts[p - 1];
      if (text) speak(text);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const headingText = activeProject ? `This is your project ${activeProject.name}.` : "Project Home.";
  const sublineText = `You have ${detailMetrics.objectives} goal${detailMetrics.objectives === 1 ? "" : "s"}, ${detailMetrics.totalTasks} task${detailMetrics.totalTasks === 1 ? "" : "s"} in total, ${detailMetrics.openTasks} task${detailMetrics.openTasks === 1 ? "" : "s"} currently open. What would you like to start with?`;

  const FADE: React.CSSProperties = { transition: "opacity 0.5s ease" };

  return (
    <>
      <VoiceToggle muted={muted} onToggle={() => setMuted(!muted)} />
      <PageHeroShell
        image={activeProject?.feature_image ?? undefined}
        showImageReload={false}
        heroHeightClass="h-[300px] sm:h-[560px] md:h-[640px]"
        overlap={500}
      >
        <div style={{ padding: "32px 32px 48px" }}>
          {/* Heading — phase 1 */}
          <div style={{ ...FADE, opacity: phase >= 1 ? 1 : 0 }}>
            <h1
              style={{
                fontSize: 26,
                fontWeight: 700,
                color: "var(--skin-ink)",
                marginBottom: 2,
                letterSpacing: "-0.01em",
              }}
            >
              {phase >= 1 ? <Typewriter text={headingText} caret={false} /> : null}
            </h1>
            <p style={{ fontSize: 14, color: "var(--skin-ink-soft)", marginBottom: 28 }}>
              {sublineText}
            </p>
          </div>

          {/* Input — phase 2 */}
          <div style={{ ...FADE, opacity: phase >= 2 ? 1 : 0, marginBottom: 36 }}>
            <InputBox
              {...props}
              activeProjectId={activeProject?.id}
              placeholder="Ask Chi about your project, or jot something down…"
            />
          </div>

          {/* Tool tiles — phase 3 */}
          <section style={{ ...FADE, opacity: phase >= 3 ? 1 : 0, marginBottom: 36 }}>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--skin-ink-faint)",
                marginBottom: 12,
              }}
            >
              Tools
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <ToolTile title="Project Journal" videoSrc={CARD_VIDEOS.journal} to="/journal" />
              <ToolTile title="New Note" videoSrc={CARD_VIDEOS.note} to="/notes" />
              <ToolTile title="Project Navigator" videoSrc={CARD_VIDEOS.navigator} to="/navigator" />
            </div>
          </section>

          {/* Suggested next steps — phase 4 */}
          <section style={{ ...FADE, opacity: phase >= 4 ? 1 : 0 }}>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--skin-ink-faint)",
                marginBottom: 12,
              }}
            >
              Suggested next steps
            </div>
            <div
              style={{
                border: "1.5px dashed var(--skin-line)",
                borderRadius: 10,
                padding: "24px 20px",
                color: "var(--skin-ink-faint)",
                fontSize: 13,
                textAlign: "center",
              }}
            >
              Backcaster-generated suggestions — coming soon.
            </div>
          </section>
        </div>
      </PageHeroShell>
    </>
  );
}

// ─── Experimental Chat View (shown after Send from Home) ──────────────────────

export function ExperimentalChatView(props: ExperimentalChatProps) {
  const {
    messages, typingMessageId, isLoading,
    projects, onProjectSelect, onCreateProject,
    onCardConfirm, onCardDismiss, hiddenCardIds,
    draft, onDraftChange, onSend,
    voice, fileInputRef, attachment, onAttachmentSet,
    mentionMenuOpen, mentionQuery, onMentionSelect,
    mentionedEntities, onMentionedEntitiesChange,
    onMentionMenuClose, onMentionToggle,
    activeProject, onBack,
  } = props;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        background: "var(--skin-surface)",
      }}
    >
      {/* Back bar */}
      <div
        style={{
          flexShrink: 0,
          padding: "12px 20px",
          borderBottom: "1px solid var(--skin-line)",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <button
          onClick={onBack}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 12,
            color: "var(--skin-ink-soft)",
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 0,
          }}
        >
          ← Back to Home
        </button>
        {activeProject && (
          <span
            style={{
              fontSize: 12,
              color: "var(--skin-ink-faint)",
              borderLeft: "1px solid var(--skin-line)",
              paddingLeft: 10,
            }}
          >
            {activeProject.name}
          </span>
        )}
      </div>

      {/* Thread */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px 8px" }}>
        <div style={{ maxWidth: 640, margin: "0 auto" }}>
          <ChatThread
            messages={messages}
            projects={projects}
            onProjectSelect={onProjectSelect}
            onCreateProject={onCreateProject}
            typingMessageId={typingMessageId}
            isLoading={isLoading}
            onCardConfirm={onCardConfirm}
            onCardDismiss={onCardDismiss}
            hiddenCardIds={hiddenCardIds}
          />
        </div>
      </div>

      {/* Input footer */}
      <div
        style={{
          flexShrink: 0,
          borderTop: "1px solid var(--skin-line)",
          padding: "12px 20px 16px",
        }}
      >
        <div style={{ maxWidth: 640, margin: "0 auto" }}>
          <InputBox
            draft={draft}
            onDraftChange={onDraftChange}
            onSend={onSend}
            isLoading={isLoading}
            voice={voice}
            fileInputRef={fileInputRef}
            attachment={attachment}
            onAttachmentSet={onAttachmentSet}
            mentionMenuOpen={mentionMenuOpen}
            mentionQuery={mentionQuery}
            onMentionSelect={onMentionSelect}
            mentionedEntities={mentionedEntities}
            onMentionedEntitiesChange={onMentionedEntitiesChange}
            onMentionMenuClose={onMentionMenuClose}
            onMentionToggle={onMentionToggle}
            activeProjectId={activeProject?.id}
          />
        </div>
      </div>
    </div>
  );
}
