/**
 * CompanionGlassPanelV2 — experimental layout
 *
 * Structural fork of the inline glass panel in home.tsx.
 * Changes vs. default:
 *   - Right-anchored floating panel instead of centered column
 *   - Compact density (tighter padding, smaller radii)
 *   - Nav pills move inside the panel header for persistent access
 *   - Chat + input stack in a narrower (380px) fixed-right column
 *
 * Activate with ?ui=experimental on /home.
 * Original layout in src/routes/home.tsx is untouched.
 */

import { useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  BookOpen,
  Navigation,
  Paperclip,
  Plus,
  Mic,
  MicOff,
  StickyNote,
  Zap,
  X,
} from "lucide-react";
import { ChatThread } from "@/components/companion/ChatThread";
import { MentionMenu, type MentionEntity } from "@/components/MentionMenu";
import type { ChatMessage } from "@/components/companion/ChatThread";
import type { ProjectFull } from "@/types/xcamp";
import type { AICard } from "@xchange/client";
import type { EntityType } from "@/components/JournalFlow";
import type { TTSErrorInfo } from "@/lib/ttsClient";

// ─── Props ────────────────────────────────────────────────────────────────────

interface VoiceState {
  isListening: boolean;
  supported: boolean;
  start: () => void;
  stop: () => void;
}

export interface CompanionGlassPanelV2Props {
  messages: ChatMessage[];
  projects: ProjectFull[];
  onProjectSelect: (project: ProjectFull) => void;
  onCreateProject: () => void;
  typingMessageId?: string;
  isLoading: boolean;
  onCardConfirm: (card: AICard, selectedType: EntityType) => void;
  onCardDismiss: (card: AICard) => void;
  hiddenCardIds: Set<string>;

  ttsError: TTSErrorInfo | null;
  dismissedTtsError: boolean;
  muted: boolean;
  onDismissTtsError: () => void;

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

  activeProjectId?: string;
}

// ─── Nav pills (compact, inside-panel version) ────────────────────────────────

const NAV_PILLS = [
  { id: "journal",    label: "Journal",   icon: BookOpen,   to: "/journal" },
  { id: "notes",      label: "Notes",     icon: StickyNote, to: "/notes" },
  { id: "navigator",  label: "Navigator", icon: Navigation, to: "/navigator" },
  { id: "backcaster", label: "New Project", icon: Zap,      to: "/project-builder" },
] as const;

// ─── Component ────────────────────────────────────────────────────────────────

export function CompanionGlassPanelV2({
  messages,
  projects,
  onProjectSelect,
  onCreateProject,
  typingMessageId,
  isLoading,
  onCardConfirm,
  onCardDismiss,
  hiddenCardIds,
  ttsError,
  dismissedTtsError,
  muted,
  onDismissTtsError,
  draft,
  onDraftChange,
  onSend,
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
}: CompanionGlassPanelV2Props) {
  const navigate = useNavigate();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  return (
    <>
      {/* Right-anchored panel — fixed to viewport right edge */}
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: "min(390px, 94vw)",
          zIndex: 10,
          display: "flex",
          flexDirection: "column",
          background: "var(--glass-bg)",
          borderLeft: "1px solid var(--glass-border-color)",
          boxShadow: "-8px 0 32px rgba(0,0,0,0.28)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          color: "var(--glass-text)",
        }}
      >
        {/* ── Panel header: title + nav pills ───────────────────────────── */}
        <div
          style={{
            flexShrink: 0,
            borderBottom: "1px solid var(--glass-divider)",
            padding: "10px 12px 8px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 8,
            }}
          >
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "var(--glass-text-soft)",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}
            >
              Chi Companion
            </span>
            {/* Experiment badge */}
            <span
              style={{
                fontSize: 10,
                fontWeight: 500,
                color: "var(--skin-accent, #4de0c1)",
                background: "rgba(77,224,193,0.12)",
                border: "1px solid rgba(77,224,193,0.3)",
                borderRadius: 4,
                padding: "1px 6px",
                letterSpacing: "0.04em",
              }}
            >
              V2 experimental
            </span>
          </div>

          {/* Compact nav pills — horizontal scroll */}
          <div
            style={{
              display: "flex",
              gap: 4,
              overflowX: "auto",
              scrollbarWidth: "none",
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
                  padding: "4px 10px",
                  borderRadius: 999,
                  border: "1px solid var(--glass-pill-border)",
                  background: "var(--glass-pill-bg)",
                  color: "var(--glass-text)",
                  cursor: "pointer",
                  fontSize: 11,
                  fontWeight: 500,
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                }}
              >
                <pill.icon size={10} />
                {pill.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Chat thread ────────────────────────────────────────────────── */}
        <div style={{ flex: 1, overflowY: "auto", padding: "12px 12px 6px" }}>
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

        {/* ── TTS error banner ───────────────────────────────────────────── */}
        {ttsError && !dismissedTtsError && !muted && (
          <div
            role="alert"
            style={{
              margin: "0 10px",
              padding: "6px 10px",
              borderRadius: 6,
              border: "1px solid rgba(239,68,68,0.4)",
              background: "rgba(239,68,68,0.1)",
              fontSize: 11,
              color: "rgba(239,68,68,0.9)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 6,
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
              onClick={onDismissTtsError}
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color: "inherit",
                fontSize: 14,
                padding: "0 2px",
              }}
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>
        )}

        {/* ── Input section — compact density ───────────────────────────── */}
        <div
          style={{
            flexShrink: 0,
            borderTop: "1px solid var(--glass-divider)",
            padding: "8px 10px 10px",
          }}
        >
          {/* Mentioned entity chips */}
          {mentionedEntities.length > 0 && (
            <div
              style={{
                display: "flex",
                gap: 4,
                flexWrap: "wrap",
                marginBottom: 5,
              }}
            >
              {mentionedEntities.map((e) => (
                <span
                  key={e.id}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 3,
                    padding: "1px 6px",
                    borderRadius: 999,
                    background: "var(--skin-accent, #4de0c1)",
                    color: "var(--skin-bg, #fff)",
                    fontSize: 10,
                    fontWeight: 500,
                  }}
                >
                  @{e.title}
                  <button
                    onClick={() =>
                      onMentionedEntitiesChange(
                        mentionedEntities.filter((x) => x.id !== e.id),
                      )
                    }
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "inherit",
                      padding: 0,
                      fontSize: 12,
                      lineHeight: 1,
                    }}
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

            <div style={{ display: "flex", gap: 6, alignItems: "stretch" }}>
              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                style={{ display: "none" }}
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null;
                  onAttachmentSet(file);
                  e.target.value = "";
                }}
              />

              {/* Textarea — compact rows */}
              <textarea
                ref={textareaRef}
                value={draft}
                onChange={onDraftChange}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    onMentionMenuClose();
                    return;
                  }
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    onSend();
                  }
                }}
                rows={3}
                placeholder={
                  voice.isListening
                    ? "Listening…"
                    : isLoading
                    ? "Chi is thinking…"
                    : "Ask Chi… (@ to mention)"
                }
                disabled={isLoading}
                style={{
                  flex: 1,
                  resize: "none",
                  background: "var(--glass-input-bg)",
                  border: voice.isListening
                    ? "1px solid var(--skin-accent, #4de0c1)"
                    : "1px solid var(--glass-input-border)",
                  borderRadius: 8,
                  color: "var(--glass-text)",
                  fontSize: 13,
                  padding: "7px 10px",
                  outline: "none",
                  fontFamily: "inherit",
                  opacity: isLoading ? 0.5 : 1,
                  transition: "border-color 0.2s",
                }}
              />

              {/* Compact icon column */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 3,
                  flexShrink: 0,
                  justifyContent: "space-between",
                }}
              >
                <CompactIconBtn
                  title="Add mention"
                  onClick={onMentionToggle}
                  active={mentionMenuOpen}
                >
                  <Plus size={12} />
                </CompactIconBtn>
                <CompactIconBtn
                  title="Attach file"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Paperclip size={12} />
                </CompactIconBtn>
                <CompactIconBtn
                  title={
                    !voice.supported
                      ? "Voice not supported"
                      : voice.isListening
                      ? "Stop recording"
                      : "Voice input"
                  }
                  onClick={() =>
                    voice.isListening ? voice.stop() : voice.start()
                  }
                  disabled={!voice.supported}
                  active={voice.isListening}
                >
                  {voice.isListening ? (
                    <MicOff size={12} />
                  ) : (
                    <Mic size={12} />
                  )}
                </CompactIconBtn>
                <button
                  onClick={onSend}
                  disabled={!draft.trim() || isLoading}
                  title="Send"
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 7,
                    background: "var(--skin-accent-gradient)",
                    border: "none",
                    color: "white",
                    cursor:
                      draft.trim() && !isLoading ? "pointer" : "not-allowed",
                    opacity: draft.trim() && !isLoading ? 1 : 0.4,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 13,
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
                marginTop: 5,
                display: "flex",
                alignItems: "center",
                gap: 5,
                fontSize: 10,
                color: "var(--glass-text-soft)",
              }}
            >
              <Paperclip size={9} />
              <span
                style={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  maxWidth: 200,
                }}
              >
                {attachment.name}
              </span>
              <button
                onClick={() => onAttachmentSet(null)}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "inherit",
                  fontSize: 12,
                  padding: 0,
                }}
                aria-label="Remove attachment"
              >
                <X size={10} />
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ─── CompactIconBtn ───────────────────────────────────────────────────────────

function CompactIconBtn({
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
        width: 28,
        height: 28,
        borderRadius: 6,
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
