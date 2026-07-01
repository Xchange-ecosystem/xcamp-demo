import { useEffect, useRef } from "react";
import { Typewriter } from "@/shared/ui/Typewriter";
import type { ProjectFull } from "@/types/xcamp";
import { ProjectCard } from "@/shared/ui/ProjectCard";
import { CreateProjectTile } from "@/shared/ui/CreateProjectTile";

// ─── Message types ────────────────────────────────────────────────────────────

export type ComponentMessageType = "project-grid" | "backcaster-stub" | "action-cards-stub";

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
  payload?: Record<string, unknown>;
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
}

export function ChatThread({ messages, onProjectSelect, onCreateProject, projects = [], typingMessageId }: ChatThreadProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
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
        if (msg.kind === "chi") return <ChiMessage key={msg.id} message={msg} isTyping={msg.id === typingMessageId} />;
        if (msg.kind === "user") return <UserMessage key={msg.id} message={msg} />;
        if (msg.kind === "component")
          return (
            <ComponentMessage
              key={msg.id}
              message={msg}
              projects={projects}
              onProjectSelect={onProjectSelect}
              onCreateProject={onCreateProject}
            />
          );
        return null;
      })}
      <div ref={bottomRef} />
    </div>
  );
}

// ─── ChiMessage ───────────────────────────────────────────────────────────────

function ChiMessage({ message, isTyping }: { message: ChiMsg; isTyping: boolean }) {
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
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
          background: "rgba(255,255,255,0.1)",
          borderRadius: "12px 12px 12px 4px",
          padding: "10px 14px",
          fontSize: 14,
          lineHeight: 1.5,
          color: "rgba(255,255,255,0.92)",
          maxWidth: "85%",
          minHeight: 20,
        }}
      >
        {isTyping ? (
          <Typewriter text={message.text} />
        ) : (
          message.text
        )}
      </div>
    </div>
  );
}

// ─── UserMessage ──────────────────────────────────────────────────────────────

function UserMessage({ message }: { message: UserMsg }) {
  return (
    <div style={{ display: "flex", justifyContent: "flex-end" }}>
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

// ─── ComponentMessage ─────────────────────────────────────────────────────────

interface ComponentMessageProps {
  message: ComponentMsg;
  projects: ProjectFull[];
  onProjectSelect?: (project: ProjectFull) => void;
  onCreateProject?: () => void;
}

function ComponentMessage({ message, projects, onProjectSelect, onCreateProject }: ComponentMessageProps) {
  return (
    <div
      style={{
        opacity: message.resolved ? 0.45 : 1,
        transition: "opacity 0.3s",
        pointerEvents: message.resolved ? "none" : undefined,
      }}
    >
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
      {message.type === "action-cards-stub" && (
        <ActionCardsStub />
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
        <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,0.6)" }}>
          No projects yet.
        </p>
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
        border: "1px dashed rgba(255,255,255,0.25)",
        fontSize: 13,
        color: "rgba(255,255,255,0.55)",
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
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.12)",
            fontSize: 13,
            color: "rgba(255,255,255,0.8)",
          }}
        >
          {item}
        </div>
      ))}
    </div>
  );
}
