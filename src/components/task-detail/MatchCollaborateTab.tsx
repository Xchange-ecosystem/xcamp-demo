import { Users } from "lucide-react";

// Placeholder only — Fabian is reconsidering whether binding assignment should
// exist at the task level at all (vs. only objective level), a real architecture
// question that isn't resolved yet. This renders the mockup's static layout with
// no live persistence: no reads from `task_assignments` / `assignments`, no writes.
export function MatchCollaborateTab() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 10,
          padding: "12px 14px",
          borderRadius: "var(--skin-radius, 10px)",
          border: "1px solid var(--skin-line)",
          background: "var(--skin-surface2)",
        }}
      >
        <Users size={16} style={{ color: "var(--skin-ink-faint)", flexShrink: 0, marginTop: 2 }} />
        <p style={{ fontSize: 13, color: "var(--skin-ink-soft)", margin: 0, lineHeight: 1.5 }}>
          Task-level assignment is still being designed — this tab is a preview of the layout only.
          Nothing here is saved yet.
        </p>
      </div>

      <div
        style={{
          border: "1px solid var(--skin-line)",
          borderRadius: "var(--skin-radius, 10px)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.4fr 1fr 1fr 0.8fr 0.8fr",
            gap: 0,
            padding: "8px 14px",
            background: "var(--skin-surface2)",
            borderBottom: "1px solid var(--skin-line)",
            fontSize: 11,
            fontWeight: 600,
            color: "var(--skin-ink-faint)",
            textTransform: "uppercase",
            letterSpacing: "0.04em",
          }}
        >
          <span>Member / Role</span>
          <span>Remuneration</span>
          <span>Value (Xcoins)</span>
          <span>Max hours</span>
          <span>Status</span>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.4fr 1fr 1fr 0.8fr 0.8fr",
            gap: 0,
            padding: "12px 14px",
            fontSize: 13,
            color: "var(--skin-ink-faint)",
            fontStyle: "italic",
          }}
        >
          <span>No collaborators yet</span>
          <span>—</span>
          <span>—</span>
          <span>—</span>
          <span>—</span>
        </div>
      </div>

      <button
        type="button"
        disabled
        className="x-btn-secondary"
        style={{ alignSelf: "flex-start", opacity: 0.5, cursor: "not-allowed" }}
        title="Not available yet"
      >
        + Invite a collaborator
      </button>
    </div>
  );
}
