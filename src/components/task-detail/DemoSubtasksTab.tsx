import { useState } from "react";
import { Check, Plus, Trash2, Users2 } from "lucide-react";
import { useDemoItemsStore } from "@/store/demoItemsStore";
import type { TaskTabKey } from "./tabs";

// Demo counterpart to Do & Document, for demo task ids only — a materially
// simpler "subtask data" surface (title + done/not-done, add/remove/toggle)
// per the B1 session spec, not a port of the real proof-note tabbed editor.
// No proof-notes-api.ts calls, no "Create Action or Artefact"
// (createActionSuggestion) — dropped entirely, there's no read surface for
// it anyway.
export function DemoSubtasksTab({
  taskId,
  onSwitchTab,
}: {
  taskId: string;
  onSwitchTab: (tab: TaskTabKey) => void;
}) {
  const task = useDemoItemsStore((s) => s.tasks[taskId]);
  const addSubtask = useDemoItemsStore((s) => s.addSubtask);
  const toggleSubtask = useDemoItemsStore((s) => s.toggleSubtask);
  const removeSubtask = useDemoItemsStore((s) => s.removeSubtask);
  const [title, setTitle] = useState("");

  if (!task || task.deleted) {
    return (
      <p style={{ fontSize: 13, color: "var(--skin-ink-faint)", margin: 0 }}>
        This task was removed.
      </p>
    );
  }

  const handleAdd = () => {
    const t = title.trim();
    if (!t) return;
    addSubtask(taskId, t);
    setTitle("");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--skin-ink)", margin: 0, flex: 1 }}>
          Do &amp; Document
        </h2>
        <button
          type="button"
          className="x-btn-secondary"
          onClick={() => onSwitchTab("match-collaborate")}
          style={{ display: "flex", alignItems: "center", gap: 6 }}
        >
          <Users2 size={13} />
          Find a collaborator
        </button>
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <input
          className="x-input"
          placeholder="Add a subtask…"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAdd();
            }
          }}
          style={{ flex: 1 }}
        />
        <button
          type="button"
          className="x-btn-secondary"
          onClick={handleAdd}
          disabled={!title.trim()}
          style={{ display: "flex", alignItems: "center", gap: 6 }}
        >
          <Plus size={13} />
          Add
        </button>
      </div>

      {task.subtasks.length === 0 ? (
        <p style={{ fontSize: 13, color: "var(--skin-ink-faint)", margin: 0 }}>
          No subtasks yet — add one above.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {task.subtasks.map((st) => (
            <div
              key={st.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 12px",
                borderRadius: "var(--skin-radius, 8px)",
                border: "1px solid var(--skin-line)",
                background: "var(--skin-surface)",
              }}
            >
              <button
                type="button"
                onClick={() => toggleSubtask(taskId, st.id)}
                aria-label={st.done ? "Mark not done" : "Mark done"}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 18,
                  height: 18,
                  borderRadius: 4,
                  border: `1px solid ${st.done ? "var(--skin-good)" : "var(--skin-line)"}`,
                  background: st.done ? "var(--skin-good)" : "transparent",
                  color: "white",
                  cursor: "pointer",
                  flexShrink: 0,
                }}
              >
                {st.done && <Check size={12} />}
              </button>
              <span
                style={{
                  flex: 1,
                  fontSize: 13,
                  color: st.done ? "var(--skin-ink-faint)" : "var(--skin-ink)",
                  textDecoration: st.done ? "line-through" : "none",
                }}
              >
                {st.title}
              </span>
              <button
                type="button"
                className="x-icon-link"
                title="Remove"
                onClick={() => removeSubtask(taskId, st.id)}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
