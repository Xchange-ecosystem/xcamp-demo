/**
 * ExperimentalHome — Ecosystem Home and Project Home layouts for the
 * ?nav=experimental sidebar experiment. Rendered inside CompanionHomePage
 * when navVariant === "experimental"; replaced by ExperimentalChatView
 * after the user sends their first message.
 *
 * All state lives in home.tsx; these are purely presentational.
 */

import { useRef } from "react";
import { Mic, MicOff, NotebookPen, Paperclip, Plus, Zap } from "lucide-react";
import { MentionMenu, type MentionEntity } from "@/components/MentionMenu";
import { ChatThread } from "@/components/companion/ChatThread";
import type { ChatMessage } from "@/components/companion/ChatThread";
import type { ProjectFull, XcampUser } from "@/types/xcamp";
import type { AICard } from "@xchange/client";
import type { EntityType } from "@/components/JournalFlow";

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
        />
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={onDraftChange}
          onKeyDown={(e) => {
            if (e.key === "Escape") { onMentionMenuClose(); return; }
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSend(); }
          }}
          rows={2}
          placeholder={
            voice.isListening ? "Listening…" : isLoading ? "Chi is thinking…" : (placeholder ?? "Ask Chi anything… (@ to mention)")
          }
          disabled={isLoading}
          style={{
            width: "100%",
            resize: "none",
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

// ─── Surface wrapper ──────────────────────────────────────────────────────────

function HomeSurface({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--skin-surface)",
        padding: "40px 40px 60px",
        overflowY: "auto",
      }}
    >
      <div style={{ maxWidth: 680, margin: "0 auto" }}>
        {children}
      </div>
    </div>
  );
}

// ─── Ecosystem Home (Phase 2) ─────────────────────────────────────────────────

export function EcosystemHomeView(props: ExperimentalHomeProps) {
  const { projects, onProjectSelect, onCreateProject, authUser } = props;

  return (
    <HomeSurface>
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

      {/* Input */}
      <div style={{ marginBottom: 40 }}>
        <InputBox
          {...props}
          activeProjectId={undefined}
          placeholder="Ask Chi anything, or jot down what's on your mind…"
        />
      </div>

      {/* Project tiles */}
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
              <ProjectTile key={p.id} project={p} onSelect={onProjectSelect} />
            ))}
            <NewProjectTile onSelect={onCreateProject} />
          </div>
        </section>
      )}

      {/* Recommendation cards */}
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
            icon={<NotebookPen size={16} />}
            to="/journal"
          />
          <RecommendCard
            title="Quick note"
            description="Capture a thought before it slips away."
            icon={<Paperclip size={16} />}
            to="/notes"
          />
          <RecommendCard
            title="Start a project"
            description="Launch a new initiative with Backcaster."
            icon={<Zap size={16} />}
            to="/project-builder"
          />
        </div>
      </section>
    </HomeSurface>
  );
}

function ProjectTile({ project, onSelect }: { project: ProjectFull; onSelect: (p: ProjectFull) => void }) {
  return (
    <div
      style={{
        flexShrink: 0,
        width: 200,
        border: "1px solid var(--skin-line)",
        borderRadius: 10,
        overflow: "hidden",
        background: "var(--skin-card, var(--skin-surface))",
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
        <button
          onClick={() => onSelect(project)}
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: "var(--skin-accent, #4de0c1)",
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 0,
          }}
        >
          Go to →
        </button>
      </div>
    </div>
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

function RecommendCard({
  title,
  description,
  icon,
  to,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  to: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        border: "1px solid var(--skin-line)",
        borderRadius: 10,
        padding: "12px 14px",
        background: "var(--skin-card, var(--skin-surface))",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ color: "var(--skin-ink-soft)" }}>{icon}</span>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--skin-ink)" }}>{title}</div>
          <div style={{ fontSize: 12, color: "var(--skin-ink-soft)", marginTop: 2 }}>{description}</div>
        </div>
      </div>
      <a
        href={to}
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: "var(--skin-accent, #4de0c1)",
          textDecoration: "none",
          flexShrink: 0,
          marginLeft: 12,
        }}
      >
        Go to →
      </a>
    </div>
  );
}

// ─── Project Home (Phase 3) ───────────────────────────────────────────────────

export function ProjectHomeView(props: ExperimentalHomeProps) {
  const { activeProject, authUser } = props;

  return (
    <HomeSurface>
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

      {/* Suggested next steps — placeholder */}
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
    </HomeSurface>
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

      {/* Input */}
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
