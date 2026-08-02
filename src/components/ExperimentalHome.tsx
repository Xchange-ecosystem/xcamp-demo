/**
 * ExperimentalHome — Ecosystem Home and Project Home layouts for the
 * ?nav=experimental sidebar experiment. Rendered inside CompanionHomePage
 * when navVariant === "experimental"; replaced by ExperimentalChatView
 * after the user sends their first message.
 *
 * All state lives in home.tsx; these are purely presentational.
 */

import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Paperclip, Plus, Zap } from "lucide-react";
import { MentionMenu, type MentionEntity } from "@/components/MentionMenu";
import { PageHeroShell } from "@/components/PageHeroShell";
import { ChatThread } from "@/components/companion/ChatThread";
import type { ChatMessage } from "@/components/companion/ChatThread";
import type { ProjectFull, XcampUser } from "@/types/xcamp";
import type { AICard } from "@xchange/client";
import type { EntityType } from "@/components/JournalFlow";
import { useTheme } from "@/lib/theme";
import { fetchProjectMetrics, type ProjectMetrics } from "@/lib/xcamp-api";

// ─── Hero background image paths ─────────────────────────────────────────────
// PLACEHOLDER — drop the real images at these paths to activate them.
// Swap `undefined` → the string path; no other code changes needed.
const HERO_DARK_SRC: string | undefined = undefined; // "/assets/hero-ecosystem-dark.jpg"
const HERO_LIGHT_SRC: string | undefined = undefined; // "/assets/hero-ecosystem-light.jpg"

// ─── Recommendation card video paths ─────────────────────────────────────────
const CARD_VIDEOS = {
  journal: "/assets/cards/journal.mp4",
  note: "/assets/cards/note.mp4",
  project: "/assets/cards/project.mp4",
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
  const HERO_HEIGHTS = "h-[150px] sm:h-[280px] md:h-[320px]";
  const OVERLAP = 56;

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

// ─── Recommendation card with hover-play video (Phase 9) ─────────────────────

function RecommendCard({
  title,
  description,
  videoSrc,
  to,
}: {
  title: string;
  description: string;
  videoSrc: string;
  to: string;
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
        alignItems: "center",
        justifyContent: "space-between",
        border: "1px solid var(--skin-line)",
        borderRadius: 10,
        overflow: "hidden",
        background: "var(--skin-card, var(--skin-surface))",
        cursor: "default",
      }}
    >
      {/* Video thumbnail */}
      <div style={{ flexShrink: 0, width: 72, height: 56, overflow: "hidden", background: "var(--skin-surface)" }}>
        <video
          ref={videoRef}
          src={videoSrc}
          muted
          preload="metadata"
          playsInline
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
      </div>

      {/* Text */}
      <div style={{ flex: 1, padding: "10px 14px" }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--skin-ink)" }}>{title}</div>
        <div style={{ fontSize: 12, color: "var(--skin-ink-soft)", marginTop: 2 }}>{description}</div>
      </div>

      {/* Go to link */}
      <a
        href={to}
        style={{
          flexShrink: 0,
          fontSize: 12,
          fontWeight: 600,
          color: "var(--skin-accent, #4de0c1)",
          textDecoration: "none",
          padding: "0 16px 0 0",
        }}
      >
        Go to →
      </a>
    </div>
  );
}

// ─── Ecosystem Home (Phase 5) ─────────────────────────────────────────────────

export function EcosystemHomeView(props: ExperimentalHomeProps) {
  const { projects, onProjectSelect, onCreateProject, authUser } = props;
  const { resolved: theme } = useTheme();

  // Select background image per theme — PLACEHOLDER until real images are provided.
  // To activate: set HERO_DARK_SRC and HERO_LIGHT_SRC constants at the top of this file.
  const heroSrc = theme === "dark" ? HERO_DARK_SRC : HERO_LIGHT_SRC;

  // Phase 8: batch-fetch objective + task counts for all visible projects
  const [metrics, setMetrics] = useState<ProjectMetrics>({});
  useEffect(() => {
    if (!authUser || !projects.length) return;
    let cancelled = false;
    fetchProjectMetrics(authUser, projects.map((p) => p.id))
      .then((m) => { if (!cancelled) setMetrics(m); })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [authUser, projects]);

  return (
    <EcosystemHeroLayout heroSrc={heroSrc}>
      {/* Greeting */}
      <h1
        style={{
          fontSize: 26,
          fontWeight: 700,
          color: "var(--skin-ink)",
          marginBottom: 4,
          letterSpacing: "-0.01em",
        }}
      >
        {timeGreeting()}, {firstName(authUser)}.
      </h1>
      <p style={{ fontSize: 14, color: "var(--skin-ink-soft)", marginBottom: 28 }}>
        {projects.length > 0
          ? `You have ${projects.length} project${projects.length === 1 ? "" : "s"}. What do you want to work on today?`
          : "What do you want to work on today?"}
      </p>

      {/* Input — menu opens below (Phase 7) */}
      <div style={{ marginBottom: 40 }}>
        <InputBox
          {...props}
          activeProjectId={undefined}
          placeholder="Ask Chi anything, or jot down what's on your mind…"
          placement="below"
        />
      </div>

      {/* Project tiles (Phase 8 — fully clickable, with metrics) */}
      {projects.length > 0 && (
        <section style={{ marginBottom: 36 }}>
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

      {/* Recommendation cards with videos (Phase 9) */}
      <section>
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
            to="/journal"
          />
          <RecommendCard
            title="Quick note"
            description="Capture a thought before it slips away."
            videoSrc={CARD_VIDEOS.note}
            to="/notes"
          />
          <RecommendCard
            title="Start a project"
            description="Launch a new initiative with Backcaster."
            videoSrc={CARD_VIDEOS.project}
            to="/project-builder"
          />
        </div>
      </section>
    </EcosystemHeroLayout>
  );
}

// ─── Project Home (Phase 6) ───────────────────────────────────────────────────

export function ProjectHomeView(props: ExperimentalHomeProps) {
  const { activeProject, authUser } = props;

  return (
    <PageHeroShell
      image={activeProject?.feature_image ?? undefined}
      showImageReload={false}
    >
      {/* Card content rendered inside PageHeroShell's overlapping card */}
      <div style={{ padding: "32px 32px 48px" }}>
        {/* Greeting */}
        <h1
          style={{
            fontSize: 26,
            fontWeight: 700,
            color: "var(--skin-ink)",
            marginBottom: 2,
            letterSpacing: "-0.01em",
          }}
        >
          {timeGreeting()}, {firstName(authUser)}.
        </h1>
        <p style={{ fontSize: 14, color: "var(--skin-ink-soft)", marginBottom: 28 }}>
          {activeProject ? (
            <>Working in <strong style={{ color: "var(--skin-ink)" }}>{activeProject.name}</strong>.</>
          ) : (
            "Working in project mode."
          )}
        </p>

        {/* Input */}
        <div style={{ marginBottom: 36 }}>
          <InputBox
            {...props}
            activeProjectId={activeProject?.id}
            placeholder="Ask Chi about your project, or jot something down…"
          />
        </div>

        {/* Suggested next steps — placeholder for Backcaster integration */}
        <section>
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
