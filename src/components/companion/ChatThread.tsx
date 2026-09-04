import { useEffect, useRef, useState } from "react";
import { Typewriter } from "@/shared/ui/Typewriter";
import type { ProjectFull } from "@/types/xcamp";
import type { AICard } from "@xchange/client";
import { ComponentRenderer } from "@xchange/companion";
import type { ComponentPayload } from "@xchange/companion";
import { ProjectCard } from "@/shared/ui/ProjectCard";
import { CreateProjectTile } from "@/shared/ui/CreateProjectTile";
import { EntityTypeSelector, type EntityType } from "@/components/JournalFlow";

// ─── Message types ────────────────────────────────────────────────────────────

// Legacy inline component types
type LegacyComponentType =
  "project-grid" | "backcaster-stub" | "action-cards-stub" | "action-cards";
// Spec-contracted inline component types (CC_SPEC_inline_component_contract)
type SpecComponentType = "line_chart" | "bar_chart" | "data_table" | "kpi_card" | "rubric_mini";

export type ComponentMessageType = LegacyComponentType | SpecComponentType;

const SPEC_COMPONENT_TYPES = new Set<string>([
  "line_chart",
  "bar_chart",
  "data_table",
  "kpi_card",
  "rubric_mini",
]);

export interface ChiMsg {
  id: string;
  kind: "chi";
  text: string;
}

export interface UserMsg {
  id: string;
  kind: "user";
  text: string;
}

export interface ComponentMsg {
  id: string;
  kind: "component";
  type: ComponentMessageType;
  payload?: ComponentPayload | Record<string, unknown>;
  fallback_text?: string;
  resolved?: boolean;
}

export type ChatMessage = ChiMsg | UserMsg | ComponentMsg;

// ─── ChatThread ───────────────────────────────────────────────────────────────

interface ChatThreadProps {
  messages: ChatMessage[];
  onProjectSelect?: (project: ProjectFull) => void;
  onCreateProject?: () => void;
  projects?: ProjectFull[];
  typingMessageId?: string;
  isLoading?: boolean;
  onCardConfirm?: (card: AICard, selectedType: EntityType) => void;
  onCardDismiss?: (card: AICard) => void;
  hiddenCardIds?: Set<string>;
}

export function ChatThread({
  messages,
  onProjectSelect,
  onCreateProject,
  projects = [],
  typingMessageId,
  isLoading,
  onCardConfirm,
  onCardDismiss,
  hiddenCardIds,
}: ChatThreadProps) {
  const msgRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const lastMsgIdRef = useRef<string | null>(null);

  useEffect(() => {
    const last = messages[messages.length - 1];
    if (!last || last.id === lastMsgIdRef.current) return;
    lastMsgIdRef.current = last.id;
    const el = msgRefs.current.get(last.id);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [messages]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        overflowY: "auto",
        flex: 1,
        padding: "4px 0",
      }}
    >
      {messages.map((msg) => {
        const setRef = (el: HTMLDivElement | null) => {
          if (el) msgRefs.current.set(msg.id, el);
          else msgRefs.current.delete(msg.id);
        };
        if (msg.kind === "chi")
          return (
            <ChiMessage
              key={msg.id}
              msgRef={setRef}
              message={msg}
              isTyping={msg.id === typingMessageId}
            />
          );
        if (msg.kind === "user") return <UserMessage key={msg.id} msgRef={setRef} message={msg} />;
        if (msg.kind === "component")
          return (
            <ComponentMessage
              key={msg.id}
              msgRef={setRef}
              message={msg}
              projects={projects}
              onProjectSelect={onProjectSelect}
              onCreateProject={onCreateProject}
              onCardConfirm={onCardConfirm}
              onCardDismiss={onCardDismiss}
              hiddenCardIds={hiddenCardIds}
            />
          );
        return null;
      })}
      {isLoading && <LoadingBubble />}
    </div>
  );
}

// ─── ChiMessage ───────────────────────────────────────────────────────────────

function ChiMessage({
  message,
  isTyping,
  msgRef,
}: {
  message: ChiMsg;
  isTyping: boolean;
  msgRef: (el: HTMLDivElement | null) => void;
}) {
  return (
    <div ref={msgRef} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
      {/* Static orb placeholder — pulsing animation wired in CC-2 with TTS */}
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: "50%",
          flexShrink: 0,
          background: "var(--skin-accent-gradient)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 11,
          fontWeight: 700,
          color: "white",
          marginTop: 2,
        }}
      >
        χ
      </div>
      <div
        style={{
          background: "var(--glass-bubble-bg)",
          borderRadius: "12px 12px 12px 4px",
          padding: "10px 14px",
          fontSize: 14,
          lineHeight: 1.5,
          color: "var(--glass-text)",
          maxWidth: "85%",
          minHeight: 20,
        }}
      >
        {isTyping ? <Typewriter text={message.text} /> : message.text}
      </div>
    </div>
  );
}

// ─── UserMessage ──────────────────────────────────────────────────────────────

function UserMessage({
  message,
  msgRef,
}: {
  message: UserMsg;
  msgRef: (el: HTMLDivElement | null) => void;
}) {
  return (
    <div ref={msgRef} style={{ display: "flex", justifyContent: "flex-end" }}>
      <div
        style={{
          background: "var(--skin-accent-gradient)",
          borderRadius: "12px 12px 4px 12px",
          padding: "10px 14px",
          fontSize: 14,
          lineHeight: 1.5,
          color: "white",
          maxWidth: "75%",
          whiteSpace: "pre-wrap",
        }}
      >
        {message.text}
      </div>
    </div>
  );
}

// ─── LoadingBubble ────────────────────────────────────────────────────────────

function LoadingBubble() {
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: "50%",
          flexShrink: 0,
          background: "var(--skin-accent-gradient)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 11,
          fontWeight: 700,
          color: "white",
          marginTop: 2,
        }}
      >
        χ
      </div>
      <div
        style={{
          background: "var(--glass-bubble-bg)",
          borderRadius: "12px 12px 12px 4px",
          padding: "10px 14px",
          fontSize: 14,
          lineHeight: 1.5,
          color: "var(--glass-text-soft)",
          minHeight: 20,
        }}
      >
        <Typewriter text="..." />
      </div>
    </div>
  );
}

// ─── ComponentMessage ─────────────────────────────────────────────────────────

interface ComponentMessageProps {
  message: ComponentMsg;
  projects: ProjectFull[];
  onProjectSelect?: (project: ProjectFull) => void;
  onCreateProject?: () => void;
  msgRef: (el: HTMLDivElement | null) => void;
  onCardConfirm?: (card: AICard, selectedType: EntityType) => void;
  onCardDismiss?: (card: AICard) => void;
  hiddenCardIds?: Set<string>;
}

function ComponentMessage({
  message,
  projects,
  onProjectSelect,
  onCreateProject,
  msgRef,
  onCardConfirm,
  onCardDismiss,
  hiddenCardIds,
}: ComponentMessageProps) {
  return (
    <div
      ref={msgRef}
      style={{
        opacity: message.resolved ? 0.45 : 1,
        transition: "opacity 0.3s",
        pointerEvents: message.resolved ? "none" : undefined,
      }}
    >
      {SPEC_COMPONENT_TYPES.has(message.type) ? (
        message.payload ? (
          <ComponentRenderer payload={message.payload as ComponentPayload} />
        ) : (
          <span style={{ fontSize: 13, color: "var(--skin-ink-soft)" }}>
            {message.fallback_text ?? "Component unavailable"}
          </span>
        )
      ) : (
        <>
          {message.type === "project-grid" && (
            <ProjectGridComponent
              projects={projects}
              onSelect={onProjectSelect}
              onCreateProject={onCreateProject}
            />
          )}
          {message.type === "backcaster-stub" && (
            <StubComponent label="Backcaster flow — coming in CC-3" />
          )}
          {message.type === "action-cards-stub" && <ActionCardsStub />}
          {message.type === "action-cards" && (
            <ActionCards
              cards={(message.payload as { cards?: AICard[] })?.cards ?? []}
              onConfirm={onCardConfirm}
              onDismiss={onCardDismiss}
              hiddenCardIds={hiddenCardIds}
            />
          )}
        </>
      )}
    </div>
  );
}

function ProjectGridComponent({
  projects,
  onSelect,
  onCreateProject,
}: {
  projects: ProjectFull[];
  onSelect?: (p: ProjectFull) => void;
  onCreateProject?: () => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {projects.length > 0 ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
            gap: 8,
          }}
        >
          {projects.map((p) => (
            <ProjectCard key={p.id} project={p} onClick={() => onSelect?.(p)} />
          ))}
        </div>
      ) : (
        <p style={{ margin: 0, fontSize: 13, color: "var(--glass-text-soft)" }}>No projects yet.</p>
      )}
      <CreateProjectTile onClick={onCreateProject} />
    </div>
  );
}

function StubComponent({ label }: { label: string }) {
  return (
    <div
      style={{
        padding: "12px 16px",
        borderRadius: 10,
        border: "1px dashed var(--glass-border-color)",
        fontSize: 13,
        color: "var(--glass-text-soft)",
        fontStyle: "italic",
      }}
    >
      {label}
    </div>
  );
}

function ActionCardsStub() {
  const items = ["Objective to update", "Task to complete", "Note to add to", "Person to contact"];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {items.map((item) => (
        <div
          key={item}
          style={{
            padding: "10px 14px",
            borderRadius: 8,
            background: "var(--glass-bubble-bg)",
            border: "1px solid var(--glass-border-color)",
            fontSize: 13,
            color: "var(--glass-text)",
          }}
        >
          {item}
        </div>
      ))}
    </div>
  );
}

const KIND_CONFIG: Record<string, { label: string; applyLabel: string }> = {
  action_item: { label: "Action", applyLabel: "Apply" },
  opportunity: { label: "Opportunity", applyLabel: "Explore" },
  update: { label: "Update", applyLabel: "Apply" },
  metric: { label: "Metric", applyLabel: "View" },
  urgency: { label: "Urgent", applyLabel: "Handle" },
  celebration: { label: "Win", applyLabel: "Noted" },
  content: { label: "Content", applyLabel: "Open" },
  web_result: { label: "Reference", applyLabel: "Open" },
};
const DEFAULT_KIND_CONFIG = { label: "Item", applyLabel: "Apply" };

function ActionCardItem({
  card,
  onConfirm,
  onDismiss,
}: {
  card: AICard;
  onConfirm?: (card: AICard, selectedType: EntityType) => void;
  onDismiss?: (card: AICard) => void;
}) {
  const defaultType: EntityType =
    card.kind === "task" || card.kind === "action_item" ? "task" : "note";
  const [selectedType, setSelectedType] = useState<EntityType>(defaultType);
  const config = KIND_CONFIG[card.kind] ?? DEFAULT_KIND_CONFIG;

  return (
    <div
      style={{
        border: "1px solid var(--skin-line, rgba(255,255,255,0.15))",
        borderRadius: "var(--skin-radius, 10px)",
        padding: 12,
        background: "var(--skin-surface, rgba(255,255,255,0.06))",
        marginBottom: 8,
      }}
    >
      <div
        style={{
          fontSize: "0.7em",
          color: "var(--skin-ink-faint)",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          marginBottom: 4,
        }}
      >
        {config.label}
      </div>
      <div
        style={{
          fontWeight: 600,
          color: "var(--skin-ink, rgba(255,255,255,0.92))",
          marginBottom: 4,
          fontSize: 13,
        }}
      >
        {card.title || config.label}
      </div>
      {card.body && (
        <div
          style={{
            color: "var(--skin-ink-soft, rgba(255,255,255,0.6))",
            fontSize: "0.9em",
            marginBottom: 8,
            lineHeight: 1.4,
          }}
        >
          {card.body}
        </div>
      )}
      {card.confirmable &&
        card.proposal &&
        (card.proposal as unknown as { tool?: string })?.tool !== "navigate" && (
          <div style={{ marginBottom: 8 }}>
            <EntityTypeSelector selected={selectedType} onChange={setSelectedType} />
          </div>
        )}
      {(card.dismissible ||
        card.confirmable ||
        (card.proposal as unknown as { tool?: string })?.tool === "navigate") && (
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
          {card.dismissible && (
            <button
              onClick={() => onDismiss?.(card)}
              style={{
                background: "transparent",
                color: "var(--skin-ink-soft, rgba(255,255,255,0.6))",
                border: "1px solid var(--skin-line, rgba(255,255,255,0.15))",
                borderRadius: "var(--skin-radius, 10px)",
                padding: "4px 12px",
                cursor: "pointer",
                fontSize: 12,
              }}
            >
              Dismiss
            </button>
          )}
          {(card.proposal as unknown as { tool?: string })?.tool === "navigate" ? (
            <button
              onClick={() => onConfirm?.(card, selectedType)}
              style={{
                background: "var(--skin-accent, #4de0c1)",
                color: "var(--skin-bg, #fff)",
                border: "none",
                borderRadius: "var(--skin-radius, 10px)",
                padding: "4px 12px",
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              Go to →
            </button>
          ) : card.confirmable ? (
            <button
              onClick={() => onConfirm?.(card, selectedType)}
              style={{
                background: "var(--skin-accent, #4de0c1)",
                color: "var(--skin-bg, #fff)",
                border: "none",
                borderRadius: "var(--skin-radius, 10px)",
                padding: "4px 12px",
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              Create
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}

function ActionCards({
  cards,
  onConfirm,
  onDismiss,
  hiddenCardIds,
}: {
  cards: AICard[];
  onConfirm?: (card: AICard, selectedType: EntityType) => void;
  onDismiss?: (card: AICard) => void;
  hiddenCardIds?: Set<string>;
}) {
  const visibleCards = hiddenCardIds ? cards.filter((c) => !hiddenCardIds.has(c.id)) : cards;
  if (visibleCards.length === 0) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {visibleCards.map((card) => (
        <ActionCardItem key={card.id} card={card} onConfirm={onConfirm} onDismiss={onDismiss} />
      ))}
    </div>
  );
}
