// src/components/task-detail/ReviewCompleteTab.tsx
//
// Mock content for the full-page task shell's "Review & Complete" tab
// (previously a bare ComingSoonTab). A short completion checklist + a
// "mark as reviewed" control, plus an explanation of what the left rail's
// existing "Complete task" button actually does — not a new feature, just
// surfacing the one that's already there. "Mark as reviewed" is local,
// per-open-session UI state (not persisted to demoItemsStore) since nothing
// else in the app reads a reviewed flag yet — same ephemeral-state posture
// as Accept/Dismiss on agent action cards elsewhere in this scope.
import { useState } from "react";
import { CheckCircle2, Circle } from "lucide-react";
import type { NoteRow } from "@/types/xcamp";

const CHECKLIST_ITEMS = [
  "Deliverable matches what the task description asks for",
  "Any linked objective/task is still accurate",
  "Collaborators (if any) have signed off",
];

export function ReviewCompleteTab({
  noteRow,
  onComplete,
}: {
  noteRow: NoteRow;
  onComplete: () => void;
}) {
  const [checked, setChecked] = useState<boolean[]>(() => CHECKLIST_ITEMS.map(() => false));
  const [reviewed, setReviewed] = useState(false);

  const toggle = (i: number) => setChecked((prev) => prev.map((v, idx) => (idx === i ? !v : v)));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 480 }}>
      <section>
        <h2
          style={{ marginBottom: 10, fontSize: 13, fontWeight: 600, color: "var(--skin-ink-soft)" }}
        >
          Completion checklist
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {CHECKLIST_ITEMS.map((item, i) => (
            <button
              key={item}
              type="button"
              onClick={() => toggle(i)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                textAlign: "left",
                borderRadius: 8,
                padding: "8px 10px",
                border: "1px solid var(--skin-line)",
                background: "var(--skin-surface)",
                cursor: "pointer",
              }}
            >
              {checked[i] ? (
                <CheckCircle2 size={16} style={{ color: "var(--skin-good)", flexShrink: 0 }} />
              ) : (
                <Circle size={16} style={{ color: "var(--skin-ink-faint)", flexShrink: 0 }} />
              )}
              <span
                style={{
                  fontSize: 13,
                  color: checked[i] ? "var(--skin-ink-faint)" : "var(--skin-ink)",
                  textDecoration: checked[i] ? "line-through" : "none",
                }}
              >
                {item}
              </span>
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2
          style={{ marginBottom: 10, fontSize: 13, fontWeight: 600, color: "var(--skin-ink-soft)" }}
        >
          Mark as reviewed
        </h2>
        {reviewed ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 13,
              fontWeight: 600,
              color: "var(--skin-good)",
            }}
          >
            <CheckCircle2 size={16} /> Reviewed
          </div>
        ) : (
          <button type="button" className="x-btn-secondary" onClick={() => setReviewed(true)}>
            Mark as reviewed
          </button>
        )}
        <p style={{ marginTop: 6, fontSize: 12, color: "var(--skin-ink-faint)" }}>
          Preview only — this doesn't write anywhere in the demo.
        </p>
      </section>

      <section>
        <h2
          style={{ marginBottom: 10, fontSize: 13, fontWeight: 600, color: "var(--skin-ink-soft)" }}
        >
          {noteRow.done ? "Reopen task" : "Complete task"}
        </h2>
        <p
          style={{
            fontSize: 13,
            color: "var(--skin-ink-soft)",
            margin: "0 0 10px",
            lineHeight: 1.5,
          }}
        >
          {noteRow.done
            ? "This task is marked done. Reopening it clears the done status — it won't undo anything in the checklist above."
            : 'Completing this task marks it done and clears it from "Worth your attention"-style task lists. It doesn\'t delete anything or notify collaborators in this demo.'}
        </p>
        <button type="button" className="x-btn-primary" onClick={onComplete}>
          {noteRow.done ? "Reopen task" : "Complete task"}
        </button>
      </section>
    </div>
  );
}
