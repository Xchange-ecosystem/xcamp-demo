// src/components/demo/companion/ArtifactsActionsTabContent.tsx
//
// Companion Items tab's sibling "Artifacts & Actions" tab (previously a bare
// ComingSoonTab, see CompanionInfoPanel.tsx). Two mock sections — project
// artifacts and agent-suggested actions — styled like ItemsTabContent's
// cards (same border-radius/padding/--skin-raised background) so the tab
// doesn't read as a different product. Pure fixture data, no fetch, no
// writes — "Accept"/"Dismiss" only flip local component state; "Download"/
// "Share" use the same toast()-stub convention CompanionAltitudeComposer
// already uses for demo affordances with no real backend behind them.
import { useState } from "react";
import { toast } from "sonner";
import {
  CheckCircle2,
  Download,
  ExternalLink,
  FileText,
  Presentation,
  Share2,
  Sparkles,
  X,
} from "lucide-react";

const SECTION_HEADING_STYLE = {
  marginBottom: 10,
  fontSize: 13,
  fontWeight: 600,
  color: "var(--skin-ink-soft)",
} as const;

interface ArtifactFixture {
  id: string;
  title: string;
  typeLabel: string;
  icon: typeof FileText;
  updatedLabel: string;
}

const ARTIFACTS: ArtifactFixture[] = [
  {
    id: "artifact-pitch-deck",
    title: "Pitch deck — Series draft v3",
    typeLabel: "Deck",
    icon: Presentation,
    updatedLabel: "Updated 2 days ago",
  },
  {
    id: "artifact-readiness-report",
    title: "Investment readiness report",
    typeLabel: "Report",
    icon: FileText,
    updatedLabel: "Generated last week",
  },
  {
    id: "artifact-field-notes",
    title: "Pilot site field notes — compiled",
    typeLabel: "Document",
    icon: FileText,
    updatedLabel: "Updated 5 days ago",
  },
];

interface AgentActionFixture {
  id: string;
  title: string;
  rationale: string;
  state: "suggested" | "completed";
}

const AGENT_ACTIONS: AgentActionFixture[] = [
  {
    id: "action-draft-followup",
    title: "Draft a follow-up email to Kenya Power",
    rationale: "Their last reply mentioned a site-visit date — no reply sent in 6 days.",
    state: "suggested",
  },
  {
    id: "action-flag-stale-objective",
    title: 'Flag "Close pilot with Kenya Power" as at risk',
    rationale: "No linked task has moved in 9 days and the objective's due date is in 2 weeks.",
    state: "suggested",
  },
  {
    id: "action-summarize-notes",
    title: "Summarized this week's field notes",
    rationale: "Compiled 4 notes from the pilot site into one document for the deck.",
    state: "completed",
  },
];

export function ArtifactsActionsTabContent() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <section>
        <h2 style={SECTION_HEADING_STYLE}>Artifacts</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {ARTIFACTS.map((artifact) => (
            <ArtifactCard key={artifact.id} artifact={artifact} />
          ))}
        </div>
      </section>

      <section>
        <h2 style={SECTION_HEADING_STYLE}>Agent actions</h2>
        <AgentActionsList />
      </section>
    </div>
  );
}

function ArtifactCard({ artifact }: { artifact: ArtifactFixture }) {
  const Icon = artifact.icon;
  return (
    <div
      style={{
        display: "flex",
        gap: 10,
        borderRadius: 8,
        padding: 10,
        background: "var(--skin-raised, var(--muted))",
      }}
    >
      <Icon size={16} style={{ marginTop: 2, color: "var(--skin-accent)", flexShrink: 0 }} />
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
            onClick={() => toast(`Opening "${artifact.title}" isn't part of this demo yet.`)}
          />
          <IconButton
            label="Download"
            icon={Download}
            onClick={() => toast(`Downloading "${artifact.title}" isn't part of this demo yet.`)}
          />
          <IconButton
            label="Share"
            icon={Share2}
            onClick={() => toast(`Sharing "${artifact.title}" isn't part of this demo yet.`)}
          />
        </div>
      </div>
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

function AgentActionsList() {
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [acceptedIds, setAcceptedIds] = useState<Set<string>>(new Set());

  const visible = AGENT_ACTIONS.filter((a) => !dismissedIds.has(a.id));
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
