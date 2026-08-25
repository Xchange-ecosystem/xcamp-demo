// Pending objective/task suggestion cards for the "My Goals" feed.
//
// Follows the Journal proposal-card pattern (JournalItemCard / NestedTaskCard in
// src/components/JournalFlow.tsx) — title + description, Dismiss/Accept while
// pending, collapsing to a plain "Accepted" state once persisted. No shared card
// component exists to import (confirmed in docs/phase-0-my-goals-feed-2026-08-25.md
// §2), so this follows the same shape rather than duplicating a fourth inline copy.
import { Check, Loader2, Sparkles } from "lucide-react";

export function GoalCard({
  title,
  description,
  accepted,
  busy,
  generatingMore,
  onAccept,
  onDismiss,
  onAddMoreTasks,
}: {
  title: string;
  description: string;
  accepted: boolean;
  busy: boolean;
  generatingMore: boolean;
  onAccept: () => void;
  onDismiss: () => void;
  onAddMoreTasks: () => void;
}) {
  return (
    <div
      style={{
        border: "1px solid var(--skin-accent)",
        borderRadius: 12,
        padding: "16px 18px",
        background: "var(--skin-surface)",
        boxShadow: "var(--shadow-card, none)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 6,
        }}
      >
        <span style={{ fontSize: 15, fontWeight: 700, color: "var(--skin-ink)" }}>{title}</span>
        <span
          style={{
            flexShrink: 0,
            padding: "3px 11px",
            borderRadius: 999,
            fontSize: 11,
            fontWeight: 600,
            background: "var(--skin-surface2)",
            color: accepted ? "var(--skin-accent)" : "var(--skin-ink-soft)",
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          {accepted ? (
            <>
              <Check size={11} /> New objective
            </>
          ) : (
            "New objective — pending"
          )}
        </span>
      </div>
      {description && (
        <p
          style={{
            margin: "0 0 14px",
            fontSize: 13,
            lineHeight: 1.55,
            color: "var(--skin-ink-soft)",
          }}
        >
          {description}
        </p>
      )}
      <div
        style={{
          display: "flex",
          gap: 8,
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <button
          type="button"
          onClick={onAddMoreTasks}
          disabled={generatingMore}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            border: "none",
            background: "transparent",
            padding: 0,
            cursor: generatingMore ? "not-allowed" : "pointer",
            fontSize: 12,
            fontWeight: 700,
            color: "var(--skin-accent)",
            opacity: generatingMore ? 0.5 : 1,
          }}
        >
          {generatingMore ? (
            <>
              <Loader2 size={13} className="animate-spin" /> Generating…
            </>
          ) : (
            <>
              <Sparkles size={13} /> Add more tasks
            </>
          )}
        </button>

        {!accepted && (
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={onDismiss}
              disabled={busy}
              style={{
                padding: "8px 16px",
                border: "1px solid var(--skin-line)",
                borderRadius: 999,
                background: "var(--skin-surface)",
                color: "var(--skin-ink)",
                fontSize: 12,
                fontWeight: 600,
                cursor: busy ? "not-allowed" : "pointer",
                opacity: busy ? 0.5 : 1,
              }}
            >
              Dismiss
            </button>
            <button
              type="button"
              onClick={onAccept}
              disabled={busy}
              style={{
                padding: "8px 16px",
                border: "none",
                borderRadius: 999,
                background: "var(--skin-accent)",
                color: "#fff",
                fontSize: 12,
                fontWeight: 700,
                cursor: busy ? "not-allowed" : "pointer",
                opacity: busy ? 0.7 : 1,
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              {busy ? (
                <>
                  <Loader2 size={12} className="animate-spin" /> Creating…
                </>
              ) : (
                "Accept"
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function TaskSuggestionCard({
  title,
  description,
  accepted,
  busy,
  onAccept,
  onDismiss,
}: {
  title: string;
  description: string;
  accepted: boolean;
  busy: boolean;
  onAccept: () => void;
  onDismiss: () => void;
}) {
  return (
    <div
      style={{
        border: "1px solid var(--skin-line)",
        borderRadius: 10,
        padding: "12px 14px",
        background: "var(--skin-surface)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 10,
          marginBottom: 4,
        }}
      >
        <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--skin-ink)" }}>{title}</span>
        <span
          style={{
            flexShrink: 0,
            padding: "2px 9px",
            borderRadius: 999,
            fontSize: 10.5,
            fontWeight: 600,
            background: "var(--skin-surface2)",
            color: accepted ? "var(--skin-accent)" : "var(--skin-ink-soft)",
            display: "flex",
            alignItems: "center",
            gap: 3,
          }}
        >
          {accepted ? (
            <>
              <Check size={10} /> Task
            </>
          ) : (
            "Pending"
          )}
        </span>
      </div>
      {description && (
        <p
          style={{
            margin: "0 0 10px",
            fontSize: 12.5,
            lineHeight: 1.5,
            color: "var(--skin-ink-soft)",
          }}
        >
          {description}
        </p>
      )}
      {!accepted && (
        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={onDismiss}
            disabled={busy}
            style={{
              padding: "6px 14px",
              border: "1px solid var(--skin-line)",
              borderRadius: 999,
              background: "var(--skin-surface)",
              color: "var(--skin-ink)",
              fontSize: 11.5,
              fontWeight: 600,
              cursor: busy ? "not-allowed" : "pointer",
              opacity: busy ? 0.5 : 1,
            }}
          >
            Dismiss
          </button>
          <button
            type="button"
            onClick={onAccept}
            disabled={busy}
            style={{
              padding: "6px 14px",
              border: "none",
              borderRadius: 999,
              background: "var(--skin-accent)",
              color: "#fff",
              fontSize: 11.5,
              fontWeight: 700,
              cursor: busy ? "not-allowed" : "pointer",
              opacity: busy ? 0.7 : 1,
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            {busy ? (
              <>
                <Loader2 size={11} className="animate-spin" /> Creating…
              </>
            ) : (
              "Accept"
            )}
          </button>
        </div>
      )}
    </div>
  );
}
