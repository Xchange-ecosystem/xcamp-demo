// src/components/task-detail/TaskArtifactsActionsTab.tsx
//
// Task-scoped Artifacts & Actions content — shared by the full-page task
// detail shell's "Actions & Artifacts" tab (TaskDetailShell.tsx) and the
// slide-in ItemSidepanel's "Artifacts & Actions" tab (ItemSidepanel.tsx).
// Both call this same component with the same taskId, reading task.artifacts
// / task.agentActions from useDemoItemsStore — the one shared, id-keyed
// source (see demoTaskMockContent.ts) — so the two views never show
// different mock cards for the same task. Same visual language as the
// tab-bar-level Artifacts & Actions tab (CompanionInfoPanel's
// ArtifactsActionsTabContent) but scoped to one task instead of a project.
import { useState } from "react";
import { CheckCircle2, Download, ExternalLink, FileText, Share2, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { useDemoItemsStore } from "@/store/demoItemsStore";

const SECTION_HEADING_STYLE = {
  marginBottom: 10,
  fontSize: 13,
  fontWeight: 600,
  color: "var(--skin-ink-soft)",
} as const;

export function TaskArtifactsActionsTab({ taskId }: { taskId: string }) {
  const task = useDemoItemsStore((s) => s.tasks[taskId]);

  if (!task || task.deleted) {
    return (
      <p style={{ fontSize: 13, color: "var(--skin-ink-faint)", margin: 0 }}>
        This task was removed.
      </p>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <section>
        <h2 style={SECTION_HEADING_STYLE}>Artifacts</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {task.artifacts.map((artifact) => (
            <div
              key={artifact.id}
              style={{
                display: "flex",
                gap: 10,
                borderRadius: 8,
                padding: 10,
                background: "var(--skin-raised, var(--muted))",
              }}
            >
              <FileText
                size={16}
                style={{ marginTop: 2, color: "var(--skin-accent)", flexShrink: 0 }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--skin-ink)" }}>
                  {artifact.title}
                </div>
                <div style={{ marginTop: 2, fontSize: 11, color: "var(--skin-ink-soft)" }}>
                  {artifact.typeLabel} · {artifact.updatedLabel}
                </div>
                <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                  <IconButton
                    label="Open"
                    icon={ExternalLink}
                    onClick={() =>
                      toast(`Opening "${artifact.title}" isn't part of this demo yet.`)
                    }
                  />
                  <IconButton
                    label="Download"
                    icon={Download}
                    onClick={() =>
                      toast(`Downloading "${artifact.title}" isn't part of this demo yet.`)
                    }
                  />
                  <IconButton
                    label="Share"
                    icon={Share2}
                    onClick={() =>
                      toast(`Sharing "${artifact.title}" isn't part of this demo yet.`)
                    }
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 style={SECTION_HEADING_STYLE}>Agent actions</h2>
        <TaskAgentActionsList taskId={taskId} />
      </section>
    </div>
  );
}

function IconButton({
  label,
  icon: Icon,
  onClick,
}: {
  label: string;
  icon: typeof FileText;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        background: "none",
        border: "1px solid var(--skin-line)",
        borderRadius: 6,
        padding: "3px 9px",
        fontSize: 11,
        color: "var(--skin-ink-soft)",
        cursor: "pointer",
      }}
    >
      <Icon size={11} />
      {label}
    </button>
  );
}

// Accept/Dismiss are transient, view-local UI state (not persisted to the
// store) — same as the tab-bar-level ArtifactsActionsTabContent. The
// underlying action list itself is shared/consistent (see above); only
// "did I dismiss this in this particular open session" is ephemeral.
function TaskAgentActionsList({ taskId }: { taskId: string }) {
  const actions = useDemoItemsStore((s) => s.tasks[taskId]?.agentActions ?? []);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [acceptedIds, setAcceptedIds] = useState<Set<string>>(new Set());

  const visible = actions.filter((a) => !dismissedIds.has(a.id));
  if (visible.length === 0) {
    return (
      <p style={{ fontSize: 12, color: "var(--skin-ink-faint)" }}>No pending agent actions.</p>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {visible.map((action) => {
        const accepted = acceptedIds.has(action.id);
        return (
          <div
            key={action.id}
            style={{
              display: "flex",
              gap: 10,
              borderRadius: 8,
              padding: 10,
              background: "var(--skin-raised, var(--muted))",
              opacity: action.state === "completed" ? 0.75 : 1,
            }}
          >
            <Sparkles
              size={15}
              style={{
                marginTop: 2,
                color: action.state === "completed" ? "var(--skin-good)" : "var(--skin-accent)",
                flexShrink: 0,
              }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--skin-ink)" }}>
                {action.title}
              </div>
              <div style={{ marginTop: 2, fontSize: 11, color: "var(--skin-ink-soft)" }}>
                {action.rationale}
              </div>
              {action.state === "suggested" && (
                <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                  {accepted ? (
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        fontSize: 11,
                        fontWeight: 600,
                        color: "var(--skin-good)",
                      }}
                    >
                      <CheckCircle2 size={12} /> Accepted
                    </span>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => setDismissedIds((prev) => new Set(prev).add(action.id))}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          background: "none",
                          border: "1px solid var(--skin-line)",
                          borderRadius: 6,
                          padding: "3px 10px",
                          fontSize: 11,
                          color: "var(--skin-ink-soft)",
                          cursor: "pointer",
                        }}
                      >
                        <X size={11} /> Dismiss
                      </button>
                      <button
                        type="button"
                        onClick={() => setAcceptedIds((prev) => new Set(prev).add(action.id))}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          background: "var(--skin-accent)",
                          border: "none",
                          borderRadius: 6,
                          padding: "3px 10px",
                          fontSize: 11,
                          fontWeight: 600,
                          color: "var(--skin-on-accent, #fff)",
                          cursor: "pointer",
                        }}
                      >
                        <CheckCircle2 size={11} /> Accept
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() =>
                      toast(`Details for "${action.title}" aren't part of this demo yet.`)
                    }
                    style={{
                      background: "none",
                      border: "none",
                      padding: "3px 4px",
                      fontSize: 11,
                      color: "var(--skin-ink-faint)",
                      cursor: "pointer",
                    }}
                  >
                    View details
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
